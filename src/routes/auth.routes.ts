import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { ensureUserDirectory } from '../lib/security';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, username } = req.body;

        // Validate input
        if (!email || !password || !username) {
            res.status(400).json({ error: 'Email, password, and username are required' });
            return;
        }

        if (password.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters' });
            return;
        }

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            res.status(409).json({
                error: existingUser.email === email
                    ? 'Email already registered'
                    : 'Username already taken'
            });
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            username,
        });

        await user.save();

        // Create user's storage directory
        ensureUserDirectory(user._id.toString());

        // Generate token
        const token = generateToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                credits: user.credits,
            },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        // Find user with password field
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        // Generate token
        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                credits: user.credits,
                image: user.image,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user!;

        res.json({
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                credits: user.credits,
                image: user.image,
                storageUsed: user.storageUsed,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * PATCH /api/auth/me
 * Update current user profile
 */
router.patch('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const { username, image } = req.body;

        const updates: { username?: string; image?: string } = {};

        if (username && username !== user.username) {
            // Check if username is taken
            const existing = await User.findOne({ username, _id: { $ne: user._id } });
            if (existing) {
                res.status(409).json({ error: 'Username already taken' });
                return;
            }
            updates.username = username;
        }

        if (image !== undefined) {
            updates.image = image;
        }

        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $set: updates },
            { new: true }
        );

        res.json({
            message: 'Profile updated',
            user: {
                id: updatedUser!._id,
                email: updatedUser!.email,
                username: updatedUser!.username,
                role: updatedUser!.role,
                credits: updatedUser!.credits,
                image: updatedUser!.image,
            },
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Current and new passwords are required' });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({ error: 'New password must be at least 6 characters' });
            return;
        }

        // Get user with password
        const userWithPassword = await User.findById(user._id).select('+password');

        if (!userWithPassword) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, userWithPassword.password);

        if (!isValid) {
            res.status(401).json({ error: 'Current password is incorrect' });
            return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await User.findByIdAndUpdate(user._id, { password: hashedPassword });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
