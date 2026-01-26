import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // MongoDB
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aiclub_os',

    // Docker
    dockerSocketPath: process.env.DOCKER_SOCKET_PATH || '//./pipe/docker_engine',

    // Storage
    localStorageRoot: process.env.LOCAL_STORAGE_ROOT || 'C:/Projects/aiclub_data/',

    // Authentication
    jwtSecret: process.env.JWT_SECRET || 'changeme_to_something_secure',
    jwtExpiresIn: '7d',
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_here',

    // VM Configuration
    vm: {
        defaultImage: 'ubuntu:22.04',
        memoryLimit: 512 * 1024 * 1024, // 512MB
        pidsLimit: 100,
        baseSSHPort: 30000, // Starting port for SSH mappings
        maxVMsPerUser: 3,
    },

    // Credits
    credits: {
        default: 100,
        vmCostPerHour: 10,
    },
};
