import path from 'path';
import fs from 'fs';

/**
 * Resolves the path to a worker file, handling both development and production environments.
 * 
 * @param basePath - The base directory path (__dirname)
 * @param workerFileName - The worker file name (without extension)
 * @returns The resolved path to the worker file
 */
export function resolveWorkerPath(basePath: string, workerFileName: string): string {
  // Try different possible paths for the worker file
  const possiblePaths = [
    // Direct JS file (production build)
    path.resolve(basePath, `${workerFileName}.js`),
    // JS file in same directory (development)
    path.resolve(basePath, `${workerFileName}.ts`),
    // Compiled JS file in dist directory
    path.resolve(basePath, '../dist', `${workerFileName}.js`),
    // Relative to current directory
    path.resolve(process.cwd(), 'dist/functions', path.basename(basePath), `${workerFileName}.js`)
  ];

  // Find the first path that exists
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  // If no path exists, return the most likely path and let the error handling catch it
  return possiblePaths[0];
}