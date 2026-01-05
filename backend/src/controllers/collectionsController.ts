import { Request, Response } from 'express';
import Collection from '../models/Collection.js';
import mongoose from 'mongoose';

const getDefaultUserId = () => new mongoose.Types.ObjectId('000000000000000000000001');

export const getCollections = async (req: Request, res: Response): Promise<void> => {
    try {
        const collections = await Collection.find({ userId: getDefaultUserId() }).sort({ createdAt: -1 });
        res.json({ success: true, data: collections.map(c => ({ id: c._id.toString(), name: c.name, description: c.description, items: c.items, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), isPublic: c.isPublic, color: c.color })) });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to get collections' });
    }
};

export const createCollection = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, color } = req.body;
        if (!name) { res.status(400).json({ success: false, error: 'Name required' }); return; }
        const collection = await Collection.create({ userId: getDefaultUserId(), name, description, items: [], isPublic: false, color });
        res.status(201).json({ success: true, data: { id: collection._id.toString(), name: collection.name, description: collection.description, items: collection.items, createdAt: collection.createdAt.toISOString(), updatedAt: collection.updatedAt.toISOString(), isPublic: collection.isPublic, color: collection.color } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create collection' });
    }
};

export const updateCollection = async (req: Request, res: Response): Promise<void> => {
    try {
        const updates = req.body; delete updates._id; delete updates.userId;
        const collection = await Collection.findOneAndUpdate({ _id: req.params.id, userId: getDefaultUserId() }, { $set: updates }, { new: true });
        if (!collection) { res.status(404).json({ success: false, error: 'Collection not found' }); return; }
        res.json({ success: true, data: { id: collection._id.toString(), name: collection.name, description: collection.description, items: collection.items, createdAt: collection.createdAt.toISOString(), updatedAt: collection.updatedAt.toISOString(), isPublic: collection.isPublic, color: collection.color } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update collection' });
    }
};

export const deleteCollection = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await Collection.findOneAndDelete({ _id: req.params.id, userId: getDefaultUserId() });
        if (!result) { res.status(404).json({ success: false, error: 'Collection not found' }); return; }
        res.json({ success: true, message: 'Collection deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete collection' });
    }
};

export const addItemToCollection = async (req: Request, res: Response): Promise<void> => {
    try {
        const collection = await Collection.findOneAndUpdate({ _id: req.params.id, userId: getDefaultUserId() }, { $addToSet: { items: req.body.itemId } }, { new: true });
        if (!collection) { res.status(404).json({ success: false, error: 'Collection not found' }); return; }
        res.json({ success: true, data: { items: collection.items } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to add item' });
    }
};

export const removeItemFromCollection = async (req: Request, res: Response): Promise<void> => {
    try {
        const collection = await Collection.findOneAndUpdate({ _id: req.params.id, userId: getDefaultUserId() }, { $pull: { items: req.params.itemId } }, { new: true });
        if (!collection) { res.status(404).json({ success: false, error: 'Collection not found' }); return; }
        res.json({ success: true, data: { items: collection.items } });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to remove item' });
    }
};
