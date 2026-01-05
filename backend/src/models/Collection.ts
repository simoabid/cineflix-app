import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
    userId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    items: string[];
    createdAt: Date;
    updatedAt: Date;
    isPublic: boolean;
    color?: string;
}

const collectionSchema = new Schema<ICollection>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, maxlength: 500 },
        items: { type: [String], default: [] },
        isPublic: { type: Boolean, default: false },
        color: { type: String },
    },
    { timestamps: true }
);

collectionSchema.index({ userId: 1, name: 1 });

export const Collection = mongoose.model<ICollection>('Collection', collectionSchema);
export default Collection;
