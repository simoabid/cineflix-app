import { useAuthStore } from "@/stores/auth";
import { usePlayerStore } from "@/stores/player/store";
import { useWatchPartyStore } from "@/stores/watchParty";

export function useWatchPartySync() {
  const account = useAuthStore((s) => s.account);
  const { enabled, isHost } = useWatchPartyStore();
  const progress = usePlayerStore((s) => s.progress);
  const mediaPlaying = usePlayerStore((s) => s.mediaPlaying);
  const roomUsers = enabled
    ? [
        {
          userId: account?.userId ?? "local-user",
          isHost,
          player: {
            time: progress.time,
            duration: progress.duration,
            isPlaying: mediaPlaying.isPlaying,
            isPaused: mediaPlaying.isPaused,
            isLoading: mediaPlaying.isLoading,
            hasPlayedOnce: mediaPlaying.hasPlayedOnce,
            playbackRate: mediaPlaying.playbackRate,
            buffered: progress.buffered,
          },
        },
      ]
    : [];

  return {
    syncEnabled: false,
    users: roomUsers,
    roomUsers,
    hostUser: roomUsers.find((user) => user.isHost) ?? null,
    isBehindHost: false,
    isAheadOfHost: false,
    timeDifferenceFromHost: 0,
    syncWithHost: () => undefined,
    isSyncing: false,
    userCount: roomUsers.length,
    createRoom: async () => null,
    joinRoom: async () => null,
    leaveRoom: async () => undefined,
  };
}
