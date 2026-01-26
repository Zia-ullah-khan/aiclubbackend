import path from 'path';
import fs from 'fs';
import { config } from '../config';

/**
 * Validates that a path is within the allowed storage root
 * Prevents path traversal attacks
 */
export function validatePath(userPath: string, userId: string): string | null {
    const userRoot = path.join(config.localStorageRoot, 'users', userId);
    const resolvedPath = path.resolve(userRoot, userPath);

    // Ensure the resolved path is within the user's directory
    if (!resolvedPath.startsWith(userRoot)) {
        return null;
    }

    return resolvedPath;
}

/**
 * Sanitizes a filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
    // Remove any path separators and potentially dangerous characters
    return filename
        .replace(/[/\\]/g, '')
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '')
        .trim();
}

/**
 * Validates that a path doesn't contain dangerous patterns
 */
export function isPathSafe(inputPath: string): boolean {
    // Check for common path traversal patterns
    const dangerousPatterns = [
        '..',
        '~',
        '/etc/',
        '/root/',
        '/home/',
        'C:\\',
        'C:/',
        '\\\\',
    ];

    const normalizedPath = inputPath.toLowerCase();
    return !dangerousPatterns.some(pattern =>
        normalizedPath.includes(pattern.toLowerCase())
    );
}

/**
 * Creates the user storage directory if it doesn't exist
 */
export function ensureUserDirectory(userId: string): string {
    const userDir = path.join(config.localStorageRoot, 'users', userId);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    // Also create subdirectories
    const subdirs = ['projects', 'uploads', 'backups'];
    subdirs.forEach(subdir => {
        const subdirPath = path.join(userDir, subdir);
        if (!fs.existsSync(subdirPath)) {
            fs.mkdirSync(subdirPath, { recursive: true });
        }
    });

    return userDir;
}

/**
 * Calculates the total size of a directory
 */
export function getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    if (!fs.existsSync(dirPath)) {
        return 0;
    }

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            totalSize += getDirectorySize(filePath);
        } else {
            totalSize += stats.size;
        }
    }

    return totalSize;
}
