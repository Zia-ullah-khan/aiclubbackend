import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    username: string;
    email: string;
    password: string;
    image?: string;
    role: 'admin' | 'member';
    credits: number;
    storageUsed: number; // bytes
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username cannot exceed 30 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't include password in queries by default
        },
        image: {
            type: String,
            default: null,
        },
        role: {
            type: String,
            enum: ['admin', 'member'],
            default: 'member',
        },
        credits: {
            type: Number,
            default: 100,
            min: 0,
        },
        storageUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookups (email already indexed via unique: true)
UserSchema.index({ username: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
