import mongoose, { Document, Schema } from 'mongoose';

export interface ICreditRequest extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    amount: number;
    reason: string;
    status: 'pending' | 'approved' | 'denied';
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    reviewNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CreditRequestSchema = new Schema<ICreditRequest>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Amount must be at least 1'],
            max: [1000, 'Amount cannot exceed 1000'],
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: [500, 'Reason cannot exceed 500 characters'],
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'denied'],
            default: 'pending',
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        reviewNote: {
            type: String,
            default: null,
            trim: true,
            maxlength: [500, 'Review note cannot exceed 500 characters'],
        },
    },
    {
        timestamps: true,
    }
);

CreditRequestSchema.index({ status: 1, createdAt: -1 });

export const CreditRequest = mongoose.models.CreditRequest || mongoose.model<ICreditRequest>('CreditRequest', CreditRequestSchema);
