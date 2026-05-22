import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env?.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

/** Watch party sync state broadcasted to all members */
interface SyncState {
    currentTime: number;
    isPlaying: boolean;
    from: string;
}

/** Chat message in a watch party */
interface ChatMessage {
    partyId: string;
    userName: string;
    message: string;
    timestamp: number;
}

/** Return type of the useWatchParty hook */
interface UseWatchPartyReturn {
    isConnected: boolean;
    isHost: boolean;
    memberCount: number;
    chatMessages: ChatMessage[];
    createParty: (partyId: string, userName: string) => void;
    joinParty: (partyId: string, userName: string) => void;
    leaveParty: (partyId: string) => void;
    syncPlayback: (partyId: string, currentTime: number, isPlaying: boolean) => void;
    sendChatMessage: (partyId: string, userName: string, message: string) => void;
}

/** Hook callbacks for responding to party events */
interface UseWatchPartyOptions {
    onSyncState?: (state: SyncState) => void;
    onMemberJoined?: (data: { userName: string; memberCount: number }) => void;
    onMemberLeft?: (data: { userName: string; memberCount: number }) => void;
    onHostChanged?: (data: { newHostId: string; newHostName: string }) => void;
    onPartyError?: (data: { error: string }) => void;
}

/**
 * React hook for watch-party WebSocket functionality.
 * Manages socket lifecycle, room membership, playback sync, and chat.
 */
export function useWatchParty(options: UseWatchPartyOptions = {}): UseWatchPartyReturn {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });
        socketRef.current = socket;
        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('party-created', ({ isHost: host }) => {
            setIsHost(host);
            setMemberCount(1);
        });
        socket.on('party-joined', ({ memberCount: count, isHost: host }) => {
            setMemberCount(count);
            setIsHost(host);
        });
        socket.on('member-joined', (data: { userName: string; memberCount: number }) => {
            setMemberCount(data.memberCount);
            options.onMemberJoined?.(data);
        });
        socket.on('member-left', (data: { userName: string; memberCount: number }) => {
            setMemberCount(data.memberCount);
            options.onMemberLeft?.(data);
        });
        socket.on('sync-state', (state: SyncState) => {
            options.onSyncState?.(state);
        });
        socket.on('chat-message', (msg: ChatMessage) => {
            setChatMessages(prev => [...prev, msg]);
        });
        socket.on('host-changed', (data: { newHostId: string; newHostName: string }) => {
            setIsHost(socket.id === data.newHostId);
            options.onHostChanged?.(data);
        });
        socket.on('party-error', (data: { error: string }) => {
            options.onPartyError?.(data);
        });
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const createParty = useCallback((partyId: string, userName: string) => {
        socketRef.current?.emit('create-party', { partyId, userName });
    }, []);

    const joinParty = useCallback((partyId: string, userName: string) => {
        socketRef.current?.emit('join-party', { partyId, userName });
    }, []);

    const leaveParty = useCallback((partyId: string) => {
        socketRef.current?.emit('leave-party', partyId);
        setIsHost(false);
        setMemberCount(0);
        setChatMessages([]);
    }, []);

    const syncPlayback = useCallback((partyId: string, currentTime: number, isPlaying: boolean) => {
        socketRef.current?.emit('playback-sync', { partyId, currentTime, isPlaying });
    }, []);

    const sendChatMessage = useCallback((partyId: string, userName: string, message: string) => {
        socketRef.current?.emit('party-chat', { partyId, userName, message, timestamp: Date.now() });
    }, []);

    return {
        isConnected,
        isHost,
        memberCount,
        chatMessages,
        createParty,
        joinParty,
        leaveParty,
        syncPlayback,
        sendChatMessage,
    };
}

export default useWatchParty;
