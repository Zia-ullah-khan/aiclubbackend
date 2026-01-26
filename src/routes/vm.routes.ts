import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as dockerService from '../services/docker.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/vms
 * List all VMs for current user
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const vms = await dockerService.listUserVMs(userId);

        res.json({ vms });
    } catch (error) {
        console.error('List VMs error:', error);
        res.status(500).json({ error: 'Failed to list VMs' });
    }
});

/**
 * POST /api/vms/provision
 * Create a new VM
 */
router.post('/provision', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const { name, image, memoryLimit } = req.body;

        if (!name) {
            res.status(400).json({ error: 'VM name is required' });
            return;
        }

        // Validate name (alphanumeric and hyphens only)
        if (!/^[a-zA-Z0-9-]+$/.test(name)) {
            res.status(400).json({ error: 'VM name can only contain letters, numbers, and hyphens' });
            return;
        }

        const vm = await dockerService.provisionVM(userId, name, {
            image,
            memoryLimit,
        });

        res.status(201).json({
            message: 'VM provisioned successfully',
            vm: {
                id: vm._id,
                name: vm.name,
                status: vm.status,
                sshPort: vm.sshPort,
                image: vm.image,
                ipAddress: vm.ipAddress,
            },
        });
    } catch (error: any) {
        console.error('Provision VM error:', error);
        res.status(400).json({ error: error.message || 'Failed to provision VM' });
    }
});

/**
 * GET /api/vms/:id
 * Get VM details
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const vmId = req.params.id;

        const result = await dockerService.getVMStatus(vmId, userId);

        res.json({
            vm: {
                id: result.vm._id,
                name: result.vm.name,
                status: result.vm.status,
                sshPort: result.vm.sshPort,
                image: result.vm.image,
                ipAddress: result.vm.ipAddress,
                memoryLimit: result.vm.memoryLimit,
                totalRuntime: result.vm.totalRuntime,
                creditsConsumed: result.vm.creditsConsumed,
                createdAt: result.vm.createdAt,
            },
            containerStatus: result.containerStatus,
        });
    } catch (error: any) {
        console.error('Get VM error:', error);
        res.status(404).json({ error: error.message || 'VM not found' });
    }
});

/**
 * POST /api/vms/:id/start
 * Start a stopped VM
 */
router.post('/:id/start', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const vmId = req.params.id;

        const vm = await dockerService.startVM(vmId, userId);

        res.json({
            message: 'VM started',
            vm: {
                id: vm._id,
                name: vm.name,
                status: vm.status,
            },
        });
    } catch (error: any) {
        console.error('Start VM error:', error);
        res.status(400).json({ error: error.message || 'Failed to start VM' });
    }
});

/**
 * POST /api/vms/:id/stop
 * Stop a running VM
 */
router.post('/:id/stop', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const vmId = req.params.id;

        const vm = await dockerService.stopVM(vmId, userId);

        res.json({
            message: 'VM stopped',
            vm: {
                id: vm._id,
                name: vm.name,
                status: vm.status,
                creditsConsumed: vm.creditsConsumed,
            },
        });
    } catch (error: any) {
        console.error('Stop VM error:', error);
        res.status(400).json({ error: error.message || 'Failed to stop VM' });
    }
});

/**
 * DELETE /api/vms/:id
 * Terminate and remove a VM
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const vmId = req.params.id;

        await dockerService.terminateVM(vmId, userId);

        res.json({ message: 'VM terminated' });
    } catch (error: any) {
        console.error('Terminate VM error:', error);
        res.status(400).json({ error: error.message || 'Failed to terminate VM' });
    }
});

/**
 * POST /api/vms/:id/exec
 * Execute a command in a VM
 */
router.post('/:id/exec', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const vmId = req.params.id;
        const { command } = req.body;

        if (!command || !Array.isArray(command)) {
            res.status(400).json({ error: 'Command array is required' });
            return;
        }

        const result = await dockerService.execInVM(vmId, userId, command);

        res.json(result);
    } catch (error: any) {
        console.error('Exec in VM error:', error);
        res.status(400).json({ error: error.message || 'Failed to execute command' });
    }
});

export default router;
