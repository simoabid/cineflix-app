import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Watch party event payloads */
interface PlaybackSyncPayload {
    partyId: string;
    currentTime: number;
    isPlaying: boolean;
}

interface CreatePartyPayload {
    userName: string;
}

interface JoinPartyPayload {
    partyId: string;
    userName: string;
}

interface ChatMessagePayload {
    partyId: string;
    userName: string;
    message: string;
    timestamp: number;
}

/** Active party room metadata */
interface PartyRoom {
    hostSocketId: string;
    members: Map<string, string>; // socketId → userName
    createdAt: number;
}

/** Maximum chat message length to prevent abuse */
const MAX_CHAT_MESSAGE_LENGTH = 500 as const;

const activeParties = new Map<string, PartyRoom>();

/**
 * Generate a cryptographically random party ID (server-side only).
 * This prevents clients from choosing/guessing room IDs.
 */
function generatePartyId(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Sanitize a chat message: trim whitespace, enforce length limit, strip control characters.
 */
function sanitizeChatMessage(message: string): string {
    if (typeof message !== 'string') return '';
    // Strip control characters except newlines, trim, and truncate
    return message
        .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .slice(0, MAX_CHAT_MESSAGE_LENGTH);
}

/**
 * Authenticate a Socket.io handshake using the auth cookie JWT.
 */
function authenticateSocket(socket: Socket): boolean {
    try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) return false;
        // Parse the auth_token cookie from the cookie header
        const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, cookie) => {
            const [key, ...vals] = cookie.trim().split('=');
            if (key) acc[key.trim()] = vals.join('=');
            return acc;
        }, {});
        const token = cookies['auth_token'];
        if (!token) return false;
        const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
        (socket as any).userId = decoded.id;
        return true;
    } catch {
        return false;
    }
}

/**
 * Initializes the Socket.io server for watch-party synchronization.
 * Handles room management, playback sync, and party chat.
 * All connections require authentication via the auth cookie.
 */
export function initializeSocketServer(httpServer: HttpServer, allowedOrigins: string[]): SocketIOServer {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
        pingInterval: 25000,
        pingTimeout: 20000,
    });

    // Authentication middleware — reject unauthenticated connections
    io.use((socket, next) => {
        if (authenticateSocket(socket)) {
            next();
        } else {
            next(new Error('Authentication required'));
        }
    });

    io.on('connection', (socket: Socket) => {
        logger.info(`🔌 Socket connected: ${socket.id}`);

        /** Create a new watch party — the creator becomes the host. Party ID is server-generated. */
        socket.on('create-party', ({ userName }: CreatePartyPayload) => {
            if (!userName || typeof userName !== 'string') {
                socket.emit('party-error', { error: 'Username is required' });
                return;
            }
            const partyId = generatePartyId();
            const room: PartyRoom = {
                hostSocketId: socket.id,
                members: new Map([[socket.id, userName.trim().slice(0, 50)]]),
                createdAt: Date.now(),
            };
            activeParties.set(partyId, room);
            socket.join(partyId);
            socket.emit('party-created', { partyId, isHost: true });
            logger.info(`🎬 Party created: ${partyId} by ${userName}`);
        });

        /** Join an existing watch party */
        socket.on('join-party', ({ partyId, userName }: JoinPartyPayload) => {
            if (!partyId || typeof partyId !== 'string' || !userName || typeof userName !== 'string') {
                socket.emit('party-error', { error: 'Party ID and username are required' });
                return;
            }
            const room = activeParties.get(partyId);
            if (!room) {
                socket.emit('party-error', { error: 'Party not found' });
                return;
            }
            const sanitizedName = userName.trim().slice(0, 50);
            room.members.set(socket.id, sanitizedName);
            socket.join(partyId);
            socket.to(partyId).emit('member-joined', { userName: sanitizedName, memberCount: room.members.size });
            socket.emit('party-joined', { partyId, memberCount: room.members.size, isHost: false });
            logger.info(`👤 ${sanitizedName} joined party ${partyId} (${room.members.size} members)`);
        });

        /** Sync playback position — host-only: only the party host can broadcast sync state */
        socket.on('playback-sync', ({ partyId, currentTime, isPlaying }: PlaybackSyncPayload) => {
            if (!partyId || typeof partyId !== 'string') return;
            const room = activeParties.get(partyId);
            if (!room) return;
            // Only the host can sync playback — prevents disruptive sync injection
            if (room.hostSocketId !== socket.id) {
                socket.emit('party-error', { error: 'Only the host can sync playback' });
                return;
            }
            if (typeof currentTime !== 'number' || typeof isPlaying !== 'boolean') return;
            socket.to(partyId).emit('sync-state', { currentTime, isPlaying, from: socket.id });
        });

        /** Chat messages within the party — sanitized and length-limited */
        socket.on('party-chat', ({ partyId, userName }: ChatMessagePayload) => {
            if (!partyId || typeof partyId !== 'string') return;
            const room = activeParties.get(partyId);
            if (!room || !room.members.has(socket.id)) return;
            // Use the server-known username (not client-supplied) to prevent spoofing
            const verifiedUserName = room.members.get(socket.id) ?? 'Unknown';
            const message = sanitizeChatMessage(arguments[0]?.message ?? '');
            if (!message) return;
            const payload: ChatMessagePayload = {
                partyId,
                userName: verifiedUserName,
                message,
                timestamp: Date.now(),
            };
            io.to(partyId).emit('chat-message', payload);
        });

        /** Leave a party */
        socket.on('leave-party', (partyId: string) => {
            if (typeof partyId === 'string') {
                handleLeaveParty(socket, partyId);
            }
        });

        /** Clean up on disconnect */
        socket.on('disconnect', () => {
            logger.info(`🔌 Socket disconnected: ${socket.id}`);
            // Remove from all active parties
            for (const [partyId, room] of activeParties.entries()) {
                if (room.members.has(socket.id)) {
                    handleLeaveParty(socket, partyId);
                }
            }
        });
    });

    return io;
}

/** Handle a member leaving a party, including host migration */
function handleLeaveParty(socket: Socket, partyId: string): void {
    const room = activeParties.get(partyId);
    if (!room) return;
    const userName = room.members.get(socket.id) ?? 'Unknown';
    room.members.delete(socket.id);
    socket.leave(partyId);
    // If no members left, destroy the room
    if (room.members.size === 0) {
        activeParties.delete(partyId);
        logger.info(`🗑️ Party ${partyId} destroyed (empty)`);
        return;
    }
    // If the host left, migrate to the next member
    if (room.hostSocketId === socket.id) {
        const [newHostId] = room.members.keys();
        room.hostSocketId = newHostId;
        socket.to(partyId).emit('host-changed', { newHostId, newHostName: room.members.get(newHostId) });
        logger.info(`👑 Host migrated in party ${partyId} to ${room.members.get(newHostId)}`);
    }
    socket.to(partyId).emit('member-left', { userName, memberCount: room.members.size });
}
