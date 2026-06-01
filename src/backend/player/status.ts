export interface RemotePlayerStatus {
  userId: string;
  name?: string;
  isHost?: boolean;
  content: {
    title?: string;
    type?: string;
    tmdbId?: number;
    seasonId?: number;
    episodeId?: number;
    seasonNumber?: number;
    episodeNumber?: number;
  };
  player: {
    time: number;
    duration: number;
    isPlaying: boolean;
    isPaused?: boolean;
    isLoading?: boolean;
    hasPlayedOnce?: boolean;
    playbackRate?: number;
    buffered?: number;
  };
  time: number;
  duration: number;
  isPlaying: boolean;
  updatedAt: number;
}

export interface RoomStatusesResponse {
  users: Record<string, RemotePlayerStatus[]>;
}

export async function sendPlayerStatus(..._args: unknown[]): Promise<void> {
  // Watch-party status reporting is not connected to Cineflix backend yet.
}

export async function getRoomStatuses(
  ..._args: unknown[]
): Promise<RoomStatusesResponse> {
  return { users: {} };
}

export async function getUserPlayerStatus(
  ..._args: unknown[]
): Promise<RemotePlayerStatus | null> {
  return null;
}
