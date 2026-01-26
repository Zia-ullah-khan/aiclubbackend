import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { validatePath, sanitizeFilename, isPathSafe, getDirectorySize } from '../lib/security';
import { User } from '../models';

export interface FileInfo {
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modifiedAt: Date;
    createdAt: Date;
}

export interface DirectoryContents {
    currentPath: string;
    files: FileInfo[];
    totalSize: number;
}

/**
 * List contents of a directory
 */
export async function listDirectory(
    userId: string,
    relativePath: string = ''
): Promise<DirectoryContents> {
    const absPath = validatePath(relativePath || '.', userId);
    if (!absPath) {
        throw new Error('Invalid path');
    }

    if (!fs.existsSync(absPath)) {
        throw new Error('Directory not found');
    }

    const stats = fs.statSync(absPath);
    if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
    }

    const entries = fs.readdirSync(absPath, { withFileTypes: true });
    const files: FileInfo[] = [];

    for (const entry of entries) {
        const entryPath = path.join(absPath, entry.name);
        const entryStats = fs.statSync(entryPath);

        files.push({
            name: entry.name,
            path: path.relative(path.join(config.localStorageRoot, 'users', userId), entryPath),
            isDirectory: entry.isDirectory(),
            size: entry.isDirectory() ? 0 : entryStats.size,
            modifiedAt: entryStats.mtime,
            createdAt: entryStats.birthtime,
        });
    }

    // Sort: directories first, then alphabetically
    files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });

    return {
        currentPath: relativePath || '/',
        files,
        totalSize: getDirectorySize(absPath),
    };
}

/**
 * Read file contents
 */
export async function readFile(
    userId: string,
    relativePath: string
): Promise<{ content: string; encoding: string }> {
    if (!isPathSafe(relativePath)) {
        throw new Error('Invalid path');
    }

    const absPath = validatePath(relativePath, userId);
    if (!absPath) {
        throw new Error('Invalid path');
    }

    if (!fs.existsSync(absPath)) {
        throw new Error('File not found');
    }

    const stats = fs.statSync(absPath);
    if (stats.isDirectory()) {
        throw new Error('Path is a directory');
    }

    // Limit file size for reading
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (stats.size > maxSize) {
        throw new Error('File too large to read');
    }

    const content = fs.readFileSync(absPath, 'utf-8');

    return { content, encoding: 'utf-8' };
}

/**
 * Write file contents
 */
export async function writeFile(
    userId: string,
    relativePath: string,
    content: string
): Promise<FileInfo> {
    if (!isPathSafe(relativePath)) {
        throw new Error('Invalid path');
    }

    const absPath = validatePath(relativePath, userId);
    if (!absPath) {
        throw new Error('Invalid path');
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(absPath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(absPath, content, 'utf-8');

    const stats = fs.statSync(absPath);

    // Update user's storage used
    await updateUserStorageUsed(userId);

    return {
        name: path.basename(absPath),
        path: relativePath,
        isDirectory: false,
        size: stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
    };
}

/**
 * Create a directory
 */
export async function createDirectory(
    userId: string,
    relativePath: string
): Promise<FileInfo> {
    if (!isPathSafe(relativePath)) {
        throw new Error('Invalid path');
    }

    const absPath = validatePath(relativePath, userId);
    if (!absPath) {
        throw new Error('Invalid path');
    }

    if (fs.existsSync(absPath)) {
        throw new Error('Path already exists');
    }

    fs.mkdirSync(absPath, { recursive: true });

    const stats = fs.statSync(absPath);

    return {
        name: path.basename(absPath),
        path: relativePath,
        isDirectory: true,
        size: 0,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
    };
}

/**
 * Delete a file or directory
 */
export async function deleteItem(
    userId: string,
    relativePath: string
): Promise<void> {
    if (!isPathSafe(relativePath)) {
        throw new Error('Invalid path');
    }

    const absPath = validatePath(relativePath, userId);
    if (!absPath) {
        throw new Error('Invalid path');
    }

    if (!fs.existsSync(absPath)) {
        throw new Error('Path not found');
    }

    const stats = fs.statSync(absPath);

    if (stats.isDirectory()) {
        fs.rmSync(absPath, { recursive: true, force: true });
    } else {
        fs.unlinkSync(absPath);
    }

    // Update user's storage used
    await updateUserStorageUsed(userId);
}

/**
 * Rename/move a file or directory
 */
export async function renameItem(
    userId: string,
    oldPath: string,
    newPath: string
): Promise<FileInfo> {
    if (!isPathSafe(oldPath) || !isPathSafe(newPath)) {
        throw new Error('Invalid path');
    }

    const absOldPath = validatePath(oldPath, userId);
    const absNewPath = validatePath(newPath, userId);

    if (!absOldPath || !absNewPath) {
        throw new Error('Invalid path');
    }

    if (!fs.existsSync(absOldPath)) {
        throw new Error('Source path not found');
    }

    if (fs.existsSync(absNewPath)) {
        throw new Error('Destination path already exists');
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(absNewPath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.renameSync(absOldPath, absNewPath);

    const stats = fs.statSync(absNewPath);

    return {
        name: path.basename(absNewPath),
        path: newPath,
        isDirectory: stats.isDirectory(),
        size: stats.isDirectory() ? 0 : stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
    };
}

/**
 * Copy a file or directory
 */
export async function copyItem(
    userId: string,
    sourcePath: string,
    destPath: string
): Promise<FileInfo> {
    if (!isPathSafe(sourcePath) || !isPathSafe(destPath)) {
        throw new Error('Invalid path');
    }

    const absSourcePath = validatePath(sourcePath, userId);
    const absDestPath = validatePath(destPath, userId);

    if (!absSourcePath || !absDestPath) {
        throw new Error('Invalid path');
    }

    if (!fs.existsSync(absSourcePath)) {
        throw new Error('Source path not found');
    }

    if (fs.existsSync(absDestPath)) {
        throw new Error('Destination path already exists');
    }

    const stats = fs.statSync(absSourcePath);

    if (stats.isDirectory()) {
        fs.cpSync(absSourcePath, absDestPath, { recursive: true });
    } else {
        fs.copyFileSync(absSourcePath, absDestPath);
    }

    const newStats = fs.statSync(absDestPath);

    // Update user's storage used
    await updateUserStorageUsed(userId);

    return {
        name: path.basename(absDestPath),
        path: destPath,
        isDirectory: newStats.isDirectory(),
        size: newStats.isDirectory() ? 0 : newStats.size,
        modifiedAt: newStats.mtime,
        createdAt: newStats.birthtime,
    };
}

/**
 * Get file info
 */
export async function getFileInfo(
    userId: string,
    relativePath: string
): Promise<FileInfo> {
    if (!isPathSafe(relativePath)) {
        throw new Error('Invalid path');
    }

    const absPath = validatePath(relativePath, userId);
    if (!absPath) {
        throw new Error('Invalid path');
    }

    if (!fs.existsSync(absPath)) {
        throw new Error('Path not found');
    }

    const stats = fs.statSync(absPath);

    return {
        name: path.basename(absPath),
        path: relativePath,
        isDirectory: stats.isDirectory(),
        size: stats.isDirectory() ? getDirectorySize(absPath) : stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
    };
}

/**
 * Get user's storage usage
 */
export async function getUserStorageUsage(userId: string): Promise<{
    used: number;
    limit: number;
    percentage: number;
}> {
    const userDir = path.join(config.localStorageRoot, 'users', userId);
    const used = fs.existsSync(userDir) ? getDirectorySize(userDir) : 0;
    const limit = 1024 * 1024 * 1024; // 1GB per user

    return {
        used,
        limit,
        percentage: Math.round((used / limit) * 100),
    };
}

/**
 * Update user's storage used in database
 */
async function updateUserStorageUsed(userId: string): Promise<void> {
    const usage = await getUserStorageUsage(userId);
    await User.findByIdAndUpdate(userId, { storageUsed: usage.used });
}

/**
 * Search files in user's directory
 */
export async function searchFiles(
    userId: string,
    query: string,
    basePath: string = ''
): Promise<FileInfo[]> {
    if (!isPathSafe(basePath)) {
        throw new Error('Invalid path');
    }

    const absBasePath = validatePath(basePath || '.', userId);
    if (!absBasePath || !fs.existsSync(absBasePath)) {
        throw new Error('Invalid base path');
    }

    const results: FileInfo[] = [];
    const queryLower = query.toLowerCase();
    const maxResults = 100;

    function searchRecursive(dirPath: string): void {
        if (results.length >= maxResults) return;

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            if (results.length >= maxResults) break;

            const entryPath = path.join(dirPath, entry.name);

            if (entry.name.toLowerCase().includes(queryLower)) {
                const stats = fs.statSync(entryPath);
                results.push({
                    name: entry.name,
                    path: path.relative(path.join(config.localStorageRoot, 'users', userId), entryPath),
                    isDirectory: entry.isDirectory(),
                    size: entry.isDirectory() ? 0 : stats.size,
                    modifiedAt: stats.mtime,
                    createdAt: stats.birthtime,
                });
            }

            if (entry.isDirectory()) {
                searchRecursive(entryPath);
            }
        }
    }

    searchRecursive(absBasePath);

    return results;
}
