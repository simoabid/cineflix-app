import mongoose, { Schema, Document } from 'mongoose';

export type ContentStatus = 'notStarted' | 'inProgress' | 'completed' | 'dropped';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type ContentType = 'movie' | 'tv';

export interface IMyListItem extends Document {
    userId: mongoose.Types.ObjectId;
    contentId: number;
    contentType: ContentType;
    content: Record<string, any>;
    dateAdded: Date;
    lastWatched?: Date;
    status: ContentStatus;
    progress: number; // Percentage 0-100
    playbackPosition?: number; // In seconds
    duration?: number; // In seconds
    lastEpisode?: {
        seasonNumber: number;
        episodeNumber: number;
    };
    personalRating?: number;
    personalNotes?: string;
    priority: PriorityLevel;
    customTags: string[];
    estimatedRuntime: number;
    isInContinueWatching: boolean;
    isLiked: boolean;
    likedAt?: Date;
}

const myListSchema = new Schema<IMyListItem>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        contentId: { type: Number, required: true },
        contentType: { type: String, enum: ['movie', 'tv'], required: true },
        content: { type: Schema.Types.Mixed, required: true },
        dateAdded: { type: Date, default: Date.now },
        lastWatched: { type: Date },
        status: { type: String, enum: ['notStarted', 'inProgress', 'completed', 'dropped'], default: 'notStarted' },
        progress: { type: Number, min: 0, max: 100, default: 0 },
        playbackPosition: { type: Number, default: 0 },
        duration: { type: Number, default: 0 },
        lastEpisode: {
            seasonNumber: { type: Number },
            episodeNumber: { type: Number }
        },
        personalRating: { type: Number, min: 1, max: 5 },
        personalNotes: { type: String, maxlength: 2000 },
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        customTags: { type: [String], default: [] },
        estimatedRuntime: { type: Number, default: 0 },
        isInContinueWatching: { type: Boolean, default: false },
        isLiked: { type: Boolean, default: false },
        likedAt: { type: Date },
    },
    { timestamps: true }
);

myListSchema.index({ userId: 1, contentId: 1, contentType: 1 }, { unique: true });
myListSchema.index({ userId: 1, status: 1 });
myListSchema.index({ userId: 1, isLiked: 1 });

export const MyList = mongoose.model<IMyListItem>('MyList', myListSchema);
export default MyList;
