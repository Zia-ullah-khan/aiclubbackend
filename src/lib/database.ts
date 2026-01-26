import mongoose from 'mongoose';
import { config } from '../config';

let isConnected = false;

export async function connectDB(): Promise<void> {
    if (isConnected) {
        console.log('📦 Using existing MongoDB connection');
        return;
    }

    try {
        const conn = await mongoose.connect(config.mongodbUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('📦 MongoDB disconnected');
            isConnected = false;
        });

    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}

export async function disconnectDB(): Promise<void> {
    if (!isConnected) return;

    await mongoose.disconnect();
    isConnected = false;
    console.log('📦 MongoDB disconnected');
}
