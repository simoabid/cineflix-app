import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../utils/logger.js';

/** Watch party event payloads */
interface PlaybackSyncPayload {
    partyId: string;
    currentTime: number;
    isPlaying: boolean;
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

const activeParties = new Map<string, PartyRoom>();

/**
 * Initializes the Socket.io server for watch-party synchronization.
 * Handles room management, playback sync, and party chat.
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

    io.on('connection', (socket: Socket) => {
        logger.info(`🔌 Socket connected: ${socket.id}`);

        /** Create a new watch party — the creator becomes the host */
        socket.on('create-party', ({ partyId, userName }: JoinPartyPayload) => {
            const room: PartyRoom = {
                hostSocketId: socket.id,
                members: new Map([[socket.id, userName]]),
                createdAt: Date.now(),
            };
            activeParties.set(partyId, room);
            socket.join(partyId);
            socket.emit('party-created', { partyId, isHost: true });
            logger.info(`🎬 Party created: ${partyId} by ${userName}`);
        });

        /** Join an existing watch party */
        socket.on('join-party', ({ partyId, userName }: JoinPartyPayload) => {
            const room = activeParties.get(partyId);
            if (!room) {
                socket.emit('party-error', { error: 'Party not found' });
                return;
            }
            room.members.set(socket.id, userName);
            socket.join(partyId);
            socket.to(partyId).emit('member-joined', { userName, memberCount: room.members.size });
            socket.emit('party-joined', { partyId, memberCount: room.members.size, isHost: false });
            logger.info(`👤 ${userName} joined party ${partyId} (${room.members.size} members)`);
        });

        /** Sync playback position — host broadcasts to all party members */
        socket.on('playback-sync', ({ partyId, currentTime, isPlaying }: PlaybackSyncPayload) => {
            socket.to(partyId).emit('sync-state', { currentTime, isPlaying, from: socket.id });
        });

        /** Chat messages within the party */
        socket.on('party-chat', ({ partyId, userName, message }: ChatMessagePayload) => {
            const payload: ChatMessagePayload = { partyId, userName, message, timestamp: Date.now() };
            io.to(partyId).emit('chat-message', payload);
        });

        /** Leave a party */
        socket.on('leave-party', (partyId: string) => {
            handleLeaveParty(socket, partyId);
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
