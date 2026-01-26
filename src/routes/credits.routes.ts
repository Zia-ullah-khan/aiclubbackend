import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CreditRequest } from '../models';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/credits
 * Get current user's credit balance and usage
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user!;

        res.json({
            credits: user.credits,
            role: user.role,
        });
    } catch (error) {
        console.error('Get credits error:', error);
        res.status(500).json({ error: 'Failed to get credits' });
    }
});

/**
 * GET /api/credits/requests
 * Get current user's credit requests
 */
router.get('/requests', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;

        const requests = await CreditRequest.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ requests });
    } catch (error) {
        console.error('Get credit requests error:', error);
        res.status(500).json({ error: 'Failed to get credit requests' });
    }
});

/**
 * POST /api/credits/request
 * Submit a request for more credits
 */
router.post('/request', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const { amount, reason } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0 || amount > 1000) {
            res.status(400).json({ error: 'Amount must be between 1 and 1000' });
            return;
        }

        if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
            res.status(400).json({ error: 'Please provide a reason (at least 10 characters)' });
            return;
        }

        // Check for pending requests
        const pendingCount = await CreditRequest.countDocuments({
            userId,
            status: 'pending',
        });

        if (pendingCount >= 3) {
            res.status(400).json({ error: 'You have too many pending requests. Please wait for them to be processed.' });
            return;
        }

        const request = new CreditRequest({
            userId,
            amount,
            reason: reason.trim(),
        });

        await request.save();

        res.status(201).json({
            message: 'Credit request submitted',
            request: {
                id: request._id,
                amount: request.amount,
                reason: request.reason,
                status: request.status,
                createdAt: request.createdAt,
            },
        });
    } catch (error) {
        console.error('Submit credit request error:', error);
        res.status(500).json({ error: 'Failed to submit credit request' });
    }
});

/**
 * DELETE /api/credits/requests/:id
 * Cancel a pending credit request
 */
router.delete('/requests/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id;
        const requestId = req.params.id;

        const request = await CreditRequest.findOne({
            _id: requestId,
            userId,
            status: 'pending',
        });

        if (!request) {
            res.status(404).json({ error: 'Pending request not found' });
            return;
        }

        await CreditRequest.findByIdAndDelete(requestId);

        res.json({ message: 'Credit request cancelled' });
    } catch (error) {
        console.error('Cancel credit request error:', error);
        res.status(500).json({ error: 'Failed to cancel credit request' });
    }
});

export default router;
