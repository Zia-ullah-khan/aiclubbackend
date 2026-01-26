import mongoose, { Document, Schema } from 'mongoose';

export interface IVM extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    containerId: string;
    name: string;
    status: 'creating' | 'running' | 'stopped' | 'terminated' | 'error';
    ipAddress?: string;
    sshPort: number;
    image: string;
    memoryLimit: number;
    cpuShares: number;
    lastStartedAt?: Date;
    lastStoppedAt?: Date;
    totalRuntime: number; // in seconds
    creditsConsumed: number;
    createdAt: Date;
    updatedAt: Date;
}

const VMSchema = new Schema<IVM>(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        containerId: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['creating', 'running', 'stopped', 'terminated', 'error'],
            default: 'creating',
        },
        ipAddress: {
            type: String,
            default: null,
        },
        sshPort: {
            type: Number,
            required: true,
            unique: true,
        },
        image: {
            type: String,
            default: 'ubuntu:22.04',
        },
        memoryLimit: {
            type: Number,
            default: 512 * 1024 * 1024, // 512MB
        },
        cpuShares: {
            type: Number,
            default: 512,
        },
        lastStartedAt: {
            type: Date,
            default: null,
        },
        lastStoppedAt: {
            type: Date,
            default: null,
        },
        totalRuntime: {
            type: Number,
            default: 0,
        },
        creditsConsumed: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for user's VMs
VMSchema.index({ ownerId: 1, status: 1 });

export const VM = mongoose.models.VM || mongoose.model<IVM>('VM', VMSchema);
