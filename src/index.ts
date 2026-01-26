import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

import { config } from './config';
import { connectDB } from './lib/database';
import { initializeWebSocket } from './websocket/terminal';
import * as dockerService from './services/docker.service';

// Import routes
import {
    authRoutes,
    vmRoutes,
    filesRoutes,
    adminRoutes,
    creditsRoutes,
} from './routes';

// Create Express app
const app = express();

// Create HTTP server for WebSocket support
const server = createServer(app);

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
    origin: config.nodeEnv === 'production'
        ? ['http://localhost:3000'] // Your frontend URL
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development)
if (config.nodeEnv === 'development') {
    app.use((req: Request, res: Response, next: NextFunction) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

// ==================== ROUTES ====================

// Health check
app.get('/health', async (req: Request, res: Response) => {
    const dockerConnected = await dockerService.pingDocker();

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'aiclub-backend',
        docker: dockerConnected ? 'connected' : 'disconnected',
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/credits', creditsRoutes);

// API documentation endpoint
app.get('/api', (req: Request, res: Response) => {
    res.json({
        name: 'AI Club OS Backend API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register a new user',
                'POST /api/auth/login': 'Login with email/password',
                'GET /api/auth/me': 'Get current user profile',
                'PATCH /api/auth/me': 'Update user profile',
                'POST /api/auth/change-password': 'Change password',
            },
            vms: {
                'GET /api/vms': 'List user VMs',
                'POST /api/vms/provision': 'Create a new VM',
                'GET /api/vms/:id': 'Get VM details',
                'POST /api/vms/:id/start': 'Start a VM',
                'POST /api/vms/:id/stop': 'Stop a VM',
                'DELETE /api/vms/:id': 'Terminate a VM',
                'POST /api/vms/:id/exec': 'Execute command in VM',
            },
            files: {
                'GET /api/files': 'List directory contents',
                'GET /api/files/content': 'Read file content',
                'POST /api/files/content': 'Write file content',
                'POST /api/files/directory': 'Create directory',
                'DELETE /api/files': 'Delete file/directory',
                'POST /api/files/rename': 'Rename/move file',
                'POST /api/files/copy': 'Copy file/directory',
                'GET /api/files/search': 'Search files',
                'GET /api/files/storage': 'Get storage usage',
            },
            credits: {
                'GET /api/credits': 'Get credit balance',
                'GET /api/credits/requests': 'List credit requests',
                'POST /api/credits/request': 'Request more credits',
                'DELETE /api/credits/requests/:id': 'Cancel credit request',
            },
            admin: {
                'GET /api/admin/users': 'List all users',
                'GET /api/admin/users/:id': 'Get user details',
                'PATCH /api/admin/users/:id': 'Update user',
                'PATCH /api/admin/users/:id/credits': 'Modify user credits',
                'DELETE /api/admin/users/:id': 'Delete user',
                'GET /api/admin/vms': 'List all VMs',
                'GET /api/admin/containers': 'List Docker containers',
                'POST /api/admin/containers/:id/stop': 'Emergency stop container',
                'DELETE /api/admin/containers/:id': 'Force remove container',
                'GET /api/admin/credit-requests': 'List credit requests',
                'PATCH /api/admin/credit-requests/:id': 'Approve/deny request',
                'GET /api/admin/docker/info': 'Get Docker info',
                'GET /api/admin/docker/ping': 'Check Docker connection',
                'GET /api/admin/stats': 'Get system statistics',
            },
            websocket: {
                'WS /ws/terminal?token=&vmId=': 'Terminal WebSocket connection',
            },
        },
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: config.nodeEnv === 'development' ? err.message : 'Internal server error'
    });
});

// ==================== START SERVER ====================

async function startServer(): Promise<void> {
    try {
        // Connect to MongoDB
        await connectDB();
        console.log('✅ Database connected');

        // Check Docker connection
        const dockerConnected = await dockerService.pingDocker();
        if (dockerConnected) {
            console.log('✅ Docker daemon connected');
        } else {
            console.warn('⚠️  Docker daemon not connected - VM features will not work');
        }

        // Initialize WebSocket server
        initializeWebSocket(server);
        console.log('✅ WebSocket server initialized');

        // Start HTTP server
        server.listen(config.port, () => {
            console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 AI Club OS Backend Server                       ║
║                                                      ║
║   HTTP:      http://localhost:${config.port}                 ║
║   WebSocket: ws://localhost:${config.port}/ws/terminal       ║
║   Environment: ${config.nodeEnv.padEnd(35)}║
║                                                      ║
╚══════════════════════════════════════════════════════╝
      `);
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received, shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', async () => {
            console.log('\nSIGINT received, shutting down gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

export { app, server };
