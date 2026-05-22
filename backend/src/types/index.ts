import { Response } from 'express';

/** Content type discriminator for movies vs TV shows */
export type ContentType = 'movie' | 'tv';

/** Watch status of a list item */
export type ContentStatus = 'notStarted' | 'inProgress' | 'completed' | 'dropped';

/** Priority level for watchlist items */
export type PriorityLevel = 'high' | 'medium' | 'low';

/** Request body for user registration */
export interface RegisterRequestBody {
    email?: string;
    password?: string;
    name?: string;
    avatar?: string;
}

/** Request body for user login */
export interface LoginRequestBody {
    email?: string;
    password?: string;
}

/** Request body for password change */
export interface ChangePasswordRequestBody {
    currentPassword?: string;
    newPassword?: string;
}

/** Request body for password reset */
export interface ResetPasswordRequestBody {
    token?: string;
    newPassword?: string;
}

/** Request body for profile updates */
export interface UpdateProfileRequestBody {
    name?: string;
    avatar?: string;
}

/** Cached TMDB content metadata stored alongside list items */
export interface ContentPayload {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    genre_ids?: number[];
    runtime?: number;
    episode_run_time?: number[];
    number_of_episodes?: number;
    number_of_seasons?: number;
}

/** Request body for adding to list */
export interface AddToListRequestBody {
    content?: ContentPayload;
    contentType?: ContentType;
}

/** Request body for progress updates */
export interface UpdateProgressRequestBody {
    contentId?: number;
    contentType?: ContentType;
    progress?: number;
    playbackPosition?: number;
    duration?: number;
    content?: ContentPayload;
    seasonNumber?: number;
    episodeNumber?: number;
}

/** Request body for toggling like */
export interface ToggleLikeRequestBody {
    contentId?: number;
    contentType?: ContentType;
}

/** Request body for liking content */
export interface LikeContentRequestBody {
    content?: ContentPayload;
    contentType?: ContentType;
}

/** Request body for bulk operations */
export interface BulkOperationRequestBody {
    type?: string;
    itemIds?: string[];
    payload?: Record<string, unknown>;
}

/** Standardized API response envelope */
export interface ApiResponseEnvelope<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/** User data returned in API responses */
export interface UserResponseData {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    createdAt: Date;
}

/** Auth response data (login/register) */
export interface AuthResponseData {
    user: UserResponseData;
    token: string;
}

/**
 * Utility to send a standardized success response.
 * Avoids ad-hoc JSON wrapping across controllers.
 */
export function sendSuccessResponse<T>(res: Response, data: T, statusCode = 200): void {
    res.status(statusCode).json({ success: true, data });
}

/**
 * Utility to send a standardized error response.
 */
export function sendErrorResponse(res: Response, error: string, statusCode = 500): void {
    res.status(statusCode).json({ success: false, error });
}
