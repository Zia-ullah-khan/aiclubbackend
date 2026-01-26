import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken } from '../middleware/auth';
import { User } from '../models';
import * as dockerService from '../services/docker.service';

interface TerminalConnection {
    ws: WebSocket;
    userId: string;
    vmId: string;
    stream?: NodeJS.ReadWriteStream;
    resize?: (w: number, h: number) => Promise<void>;
}

const connections: Map<string, TerminalConnection> = new Map();

/**
 * Initialize WebSocket server for terminal connections
 */
export function initializeWebSocket(server: Server): void {
    const wss = new WebSocketServer({
        server,
        path: '/ws/terminal',
    });

    console.log('🔌 WebSocket server initialized at /ws/terminal');

    wss.on('connection', async (ws: WebSocket, req) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const vmId = url.searchParams.get('vmId');

        // Validate token
        if (!token) {
            ws.close(1008, 'Missing authentication token');
            return;
        }

        let userId: string;
        try {
            const decoded = verifyToken(token);
            userId = decoded.userId;

            // Verify user exists
            const user = await User.findById(userId);
            if (!user) {
                ws.close(1008, 'User not found');
                return;
            }
        } catch (error) {
            ws.close(1008, 'Invalid authentication token');
            return;
        }

        if (!vmId) {
            ws.close(1008, 'Missing vmId parameter');
            return;
        }

        const connectionId = `${userId}-${vmId}-${Date.now()}`;
        console.log(`📺 Terminal connection opened: ${connectionId}`);

        const connection: TerminalConnection = {
            ws,
            userId,
            vmId,
        };

        connections.set(connectionId, connection);

        // Attach to VM container
        try {
            const { stream, resize } = await dockerService.attachToVM(vmId, userId);
            connection.stream = stream;
            connection.resize = resize;

            // Pipe container output to WebSocket
            stream.on('data', (chunk: Buffer) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'output',
                        data: chunk.toString('utf-8'),
                    }));
                }
            });

            stream.on('end', () => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'disconnect',
                        message: 'Container stream ended',
                    }));
                    ws.close(1000, 'Container disconnected');
                }
            });

            stream.on('error', (error) => {
                console.error('Stream error:', error);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Container stream error',
                    }));
                }
            });

            // Send ready signal
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Terminal connected to VM',
            }));

        } catch (error: any) {
            console.error('Failed to attach to VM:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: error.message || 'Failed to connect to VM',
            }));
            ws.close(1011, 'Failed to connect to VM');
            connections.delete(connectionId);
            return;
        }

        // Handle incoming messages from client
        ws.on('message', (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case 'input':
                        // Send input to container
                        if (connection.stream) {
                            connection.stream.write(message.data);
                        }
                        break;

                    case 'resize':
                        if (connection.resize && message.cols && message.rows) {
                            connection.resize(message.cols, message.rows).catch(console.error);
                        }
                        break;

                    case 'ping':
                        ws.send(JSON.stringify({ type: 'pong' }));
                        break;
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        });

        // Handle WebSocket close
        ws.on('close', () => {
            console.log(`📺 Terminal connection closed: ${connectionId}`);

            if (connection.stream) {
                try {
                    connection.stream.end();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }

            connections.delete(connectionId);
        });

        // Handle WebSocket errors
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            connections.delete(connectionId);
        });
    });

    // Periodic cleanup of stale connections
    setInterval(() => {
        connections.forEach((conn, id) => {
            if (conn.ws.readyState === WebSocket.CLOSED) {
                connections.delete(id);
            }
        });
    }, 30000);
}

/**
 * Get active connection count
 */
export function getActiveConnectionCount(): number {
    return connections.size;
}

/**
 * Close all connections for a specific VM
 */
export function closeVMConnections(vmId: string): void {
    connections.forEach((conn, id) => {
        if (conn.vmId === vmId) {
            conn.ws.close(1000, 'VM terminated');
            connections.delete(id);
        }
    });
}
