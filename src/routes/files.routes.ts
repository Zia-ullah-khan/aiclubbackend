import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as filesystemService from '../services/filesystem.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/files
 * List directory contents
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const path = (req.query.path as string) || '';

        const contents = await filesystemService.listDirectory(userId, path);

        res.json(contents);
    } catch (error: any) {
        console.error('List directory error:', error);
        res.status(400).json({ error: error.message || 'Failed to list directory' });
    }
});

/**
 * GET /api/files/info
 * Get file or directory info
 */
router.get('/info', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const path = req.query.path as string;

        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        const info = await filesystemService.getFileInfo(userId, path);

        res.json(info);
    } catch (error: any) {
        console.error('Get file info error:', error);
        res.status(400).json({ error: error.message || 'Failed to get file info' });
    }
});

/**
 * GET /api/files/content
 * Read file contents
 */
router.get('/content', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const path = req.query.path as string;

        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        const result = await filesystemService.readFile(userId, path);

        res.json(result);
    } catch (error: any) {
        console.error('Read file error:', error);
        res.status(400).json({ error: error.message || 'Failed to read file' });
    }
});

/**
 * POST /api/files/content
 * Write file contents
 */
router.post('/content', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const { path, content } = req.body;

        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        if (content === undefined) {
            res.status(400).json({ error: 'Content is required' });
            return;
        }

        const file = await filesystemService.writeFile(userId, path, content);

        res.json({
            message: 'File saved',
            file,
        });
    } catch (error: any) {
        console.error('Write file error:', error);
        res.status(400).json({ error: error.message || 'Failed to write file' });
    }
});

/**
 * POST /api/files/directory
 * Create a directory
 */
router.post('/directory', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const { path } = req.body;

        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        const dir = await filesystemService.createDirectory(userId, path);

        res.status(201).json({
            message: 'Directory created',
            directory: dir,
        });
    } catch (error: any) {
        console.error('Create directory error:', error);
        res.status(400).json({ error: error.message || 'Failed to create directory' });
    }
});

/**
 * DELETE /api/files
 * Delete a file or directory
 */
router.delete('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const path = req.query.path as string;

        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }

        await filesystemService.deleteItem(userId, path);

        res.json({ message: 'Item deleted' });
    } catch (error: any) {
        console.error('Delete item error:', error);
        res.status(400).json({ error: error.message || 'Failed to delete item' });
    }
});

/**
 * POST /api/files/rename
 * Rename or move a file/directory
 */
router.post('/rename', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const { oldPath, newPath } = req.body;

        if (!oldPath || !newPath) {
            res.status(400).json({ error: 'Both oldPath and newPath are required' });
            return;
        }

        const item = await filesystemService.renameItem(userId, oldPath, newPath);

        res.json({
            message: 'Item renamed',
            item,
        });
    } catch (error: any) {
        console.error('Rename item error:', error);
        res.status(400).json({ error: error.message || 'Failed to rename item' });
    }
});

/**
 * POST /api/files/copy
 * Copy a file or directory
 */
router.post('/copy', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const { sourcePath, destPath } = req.body;

        if (!sourcePath || !destPath) {
            res.status(400).json({ error: 'Both sourcePath and destPath are required' });
            return;
        }

        const item = await filesystemService.copyItem(userId, sourcePath, destPath);

        res.json({
            message: 'Item copied',
            item,
        });
    } catch (error: any) {
        console.error('Copy item error:', error);
        res.status(400).json({ error: error.message || 'Failed to copy item' });
    }
});

/**
 * GET /api/files/search
 * Search for files
 */
router.get('/search', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();
        const query = req.query.query as string;
        const basePath = (req.query.basePath as string) || '';

        if (!query) {
            res.status(400).json({ error: 'Search query is required' });
            return;
        }

        const results = await filesystemService.searchFiles(userId, query, basePath);

        res.json({ results });
    } catch (error: any) {
        console.error('Search files error:', error);
        res.status(400).json({ error: error.message || 'Failed to search files' });
    }
});

/**
 * GET /api/files/storage
 * Get storage usage
 */
router.get('/storage', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!._id.toString();

        const usage = await filesystemService.getUserStorageUsage(userId);

        res.json(usage);
    } catch (error: any) {
        console.error('Get storage usage error:', error);
        res.status(400).json({ error: error.message || 'Failed to get storage usage' });
    }
});

export default router;
