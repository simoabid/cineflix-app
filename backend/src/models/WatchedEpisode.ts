import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchedEpisode extends Document {
    userId: mongoose.Types.ObjectId;
    tvShowId: number;
    seasonNumber: number;
    episodeNumber: number;
    watchedAt: Date;
}

const watchedEpisodeSchema = new Schema<IWatchedEpisode>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        tvShowId: {
            type: Number,
            required: true
        },
        seasonNumber: {
            type: Number,
            required: true
        },
        episodeNumber: {
            type: Number,
            required: true
        },
        watchedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Compound index to ensure uniqueness per user-episode and for efficient querying
watchedEpisodeSchema.index({ userId: 1, tvShowId: 1, seasonNumber: 1, episodeNumber: 1 }, { unique: true });
watchedEpisodeSchema.index({ userId: 1, tvShowId: 1 });

export const WatchedEpisode = mongoose.model<IWatchedEpisode>('WatchedEpisode', watchedEpisodeSchema);
export default WatchedEpisode;
