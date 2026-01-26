import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models';

export interface AuthRequest extends Request {
    user?: IUser;
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: IUser): string {
    const payload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    const options: SignOptions = {
        expiresIn: '7d',
    };

    return jwt.sign(payload, config.jwtSecret, options);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
}

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token);

        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    if (req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }

    next();
}

/**
 * Optional authentication - sets user if token is valid, but doesn't fail if missing
 */
export async function optionalAuth(
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyToken(token);
            const user = await User.findById(decoded.userId);
            if (user) {
                req.user = user;
            }
        }

        next();
    } catch {
        // Ignore auth errors for optional auth
        next();
    }
}
