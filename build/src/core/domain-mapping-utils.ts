import fs from 'fs';
import path from 'path';

/**
 * Type definition for the initial domain mapping
 */
export type InitialDomainMapping = Record<string, any>;

/**
 * Loads the initial domain mapping from the resource file
 * 
 * @returns The initial domain mapping as an object
 */
export function loadInitialDomainMapping(): InitialDomainMapping {
  try {
    // Try different possible paths for the resource file
    const possiblePaths = [
      // Direct path in development
      path.resolve(process.cwd(), 'resources/initial_domain_mapping.json'),
      // Path relative to src directory
      path.resolve(process.cwd(), 'src/resources/initial_domain_mapping.json'),
      // Path relative to dist directory in production
      path.resolve(process.cwd(), 'dist/resources/initial_domain_mapping.json'),
      // Path in the root directory
      path.resolve(process.cwd(), 'initial_domain_mapping.json'),
    ];

    // Find the first path that exists
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const mappingString = fs.readFileSync(filePath, 'utf8');
        // Parse the JSON string into an object
        return JSON.parse(mappingString);
      }
    }

    // If no file is found, log a warning and return an empty object
    console.warn('Initial domain mapping file not found. Using empty object.');
    return {};
  } catch (error) {
    console.error('Error loading initial domain mapping:', error);
    return {};
  }
}