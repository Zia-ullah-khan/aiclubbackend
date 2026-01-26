import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { User, VM, CreditRequest } from '../models';
import * as dockerService from '../services/docker.service';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find()
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(),
        ]);

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Get user's VMs
        const vms = await VM.find({ ownerId: user._id });

        res.json({ user, vms });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * PATCH /api/admin/users/:id
 * Update user (role, credits, etc.)
 */
router.patch('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { role, credits } = req.body;
        const updates: { role?: string; credits?: number } = {};

        if (role && ['admin', 'member'].includes(role)) {
            updates.role = role;
        }

        if (credits !== undefined && typeof credits === 'number' && credits >= 0) {
            updates.credits = credits;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        ).select('-password');

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json({
            message: 'User updated',
            user,
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PATCH /api/admin/users/:id/credits
 * Add or remove credits from a user
 */
router.patch('/users/:id/credits', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { amount, operation } = req.body;

        if (typeof amount !== 'number' || amount <= 0) {
            res.status(400).json({ error: 'Amount must be a positive number' });
            return;
        }

        const update = operation === 'add'
            ? { $inc: { credits: amount } }
            : { $inc: { credits: -amount } };

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
            .select('-password');

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Ensure credits don't go negative
        if (user.credits < 0) {
            await User.findByIdAndUpdate(req.params.id, { credits: 0 });
            user.credits = 0;
        }

        res.json({
            message: `Credits ${operation === 'add' ? 'added' : 'removed'}`,
            user,
        });
    } catch (error) {
        console.error('Update credits error:', error);
        res.status(500).json({ error: 'Failed to update credits' });
    }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user (careful!)
 */
router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.params.id;

        // Prevent self-deletion
        if (userId === req.user!._id.toString()) {
            res.status(400).json({ error: 'Cannot delete your own account' });
            return;
        }

        // Terminate all user's VMs first
        const vms = await VM.find({ ownerId: userId });
        for (const vm of vms) {
            try {
                await dockerService.terminateVM(vm._id.toString(), userId);
            } catch (e) {
                console.error(`Failed to terminate VM ${vm._id}:`, e);
            }
        }

        await User.findByIdAndDelete(userId);

        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ==================== VM MANAGEMENT ====================

/**
 * GET /api/admin/vms
 * List all VMs
 */
router.get('/vms', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const vms = await dockerService.listAllVMs();
        res.json({ vms });
    } catch (error) {
        console.error('List VMs error:', error);
        res.status(500).json({ error: 'Failed to list VMs' });
    }
});

/**
 * GET /api/admin/containers
 * List all Docker containers on the host
 */
router.get('/containers', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const containers = await dockerService.listAllContainers();
        res.json({ containers });
    } catch (error) {
        console.error('List containers error:', error);
        res.status(500).json({ error: 'Failed to list containers' });
    }
});

/**
 * POST /api/admin/containers/:id/stop
 * Emergency stop a container
 */
router.post('/containers/:id/stop', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await dockerService.forceStopContainer(req.params.id);
        res.json({ message: 'Container stopped' });
    } catch (error) {
        console.error('Stop container error:', error);
        res.status(500).json({ error: 'Failed to stop container' });
    }
});

/**
 * DELETE /api/admin/containers/:id
 * Force remove a container
 */
router.delete('/containers/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await dockerService.forceRemoveContainer(req.params.id);
        res.json({ message: 'Container removed' });
    } catch (error) {
        console.error('Remove container error:', error);
        res.status(500).json({ error: 'Failed to remove container' });
    }
});

// ==================== CREDIT REQUESTS ====================

/**
 * GET /api/admin/credit-requests
 * List all credit requests
 */
router.get('/credit-requests', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const status = req.query.status as string;
        const filter: { status?: string } = {};

        if (status && ['pending', 'approved', 'denied'].includes(status)) {
            filter.status = status;
        }

        const requests = await CreditRequest.find(filter)
            .populate('userId', 'username email')
            .populate('reviewedBy', 'username')
            .sort({ createdAt: -1 });

        res.json({ requests });
    } catch (error) {
        console.error('List credit requests error:', error);
        res.status(500).json({ error: 'Failed to list credit requests' });
    }
});

/**
 * PATCH /api/admin/credit-requests/:id
 * Approve or deny a credit request
 */
router.patch('/credit-requests/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { action, note } = req.body;

        if (!['approve', 'deny'].includes(action)) {
            res.status(400).json({ error: 'Action must be "approve" or "deny"' });
            return;
        }

        const request = await CreditRequest.findById(req.params.id);

        if (!request) {
            res.status(404).json({ error: 'Credit request not found' });
            return;
        }

        if (request.status !== 'pending') {
            res.status(400).json({ error: 'Request has already been processed' });
            return;
        }

        request.status = action === 'approve' ? 'approved' : 'denied';
        request.reviewedBy = req.user!._id;
        request.reviewedAt = new Date();
        request.reviewNote = note;

        await request.save();

        // If approved, add credits to user
        if (action === 'approve') {
            await User.findByIdAndUpdate(request.userId, {
                $inc: { credits: request.amount },
            });
        }

        res.json({
            message: `Credit request ${action === 'approve' ? 'approved' : 'denied'}`,
            request,
        });
    } catch (error) {
        console.error('Process credit request error:', error);
        res.status(500).json({ error: 'Failed to process credit request' });
    }
});

// ==================== SYSTEM INFO ====================

/**
 * GET /api/admin/docker/info
 * Get Docker system information
 */
router.get('/docker/info', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const info = await dockerService.getDockerInfo();
        res.json({ info });
    } catch (error) {
        console.error('Get Docker info error:', error);
        res.status(500).json({ error: 'Failed to get Docker info' });
    }
});

/**
 * GET /api/admin/docker/ping
 * Check Docker connection
 */
router.get('/docker/ping', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const isConnected = await dockerService.pingDocker();
        res.json({ connected: isConnected });
    } catch (error) {
        console.error('Ping Docker error:', error);
        res.status(500).json({ error: 'Failed to ping Docker' });
    }
});

/**
 * GET /api/admin/stats
 * Get system statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const [
            totalUsers,
            totalVMs,
            runningVMs,
            pendingRequests,
        ] = await Promise.all([
            User.countDocuments(),
            VM.countDocuments(),
            VM.countDocuments({ status: 'running' }),
            CreditRequest.countDocuments({ status: 'pending' }),
        ]);

        res.json({
            stats: {
                totalUsers,
                totalVMs,
                runningVMs,
                pendingRequests,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
