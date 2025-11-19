/**
 * Utility for file system operations related to testing
 */

import { execSync } from 'child_process';
import type { ExecSyncOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Find the most recent extracted file for a given item type
 * @param itemType The item type to search for (e.g., 'users')
 * @returns The full path to the extracted file
 */
export function findExtractedFile(itemType: string): string {
  const extractedFilesFolder = process.env.EXTRACTED_FILES_FOLDER_PATH;

  if (!extractedFilesFolder) {
    throw new Error(
      'Missing required environment variable: EXTRACTED_FILES_FOLDER_PATH. ' +
      'Please set EXTRACTED_FILES_FOLDER_PATH to the path of the folder containing extracted files.'
    );
  }

  if (!fs.existsSync(extractedFilesFolder)) {
    throw new Error(
      `Extracted files folder not found at path: ${extractedFilesFolder}. ` +
      'Please ensure EXTRACTED_FILES_FOLDER_PATH points to a valid directory.'
    );
  }

  console.log(`[FileSystem] Searching for extracted file in: ${extractedFilesFolder}`);
  console.log(`[FileSystem] Looking for pattern: extractor_${itemType}`);

  // Execute the command to find the most recent file
  const command = `ls "${extractedFilesFolder}" | grep "extractor_${itemType}" | sort -r | head -n 1`;
  
  let fileName: string;
  try {
    const output = execSync(command, { encoding: 'utf-8' });
    fileName = output.trim();
  } catch (error: any) {
    throw new Error(
      `Failed to find extracted file for item type '${itemType}' in folder: ${extractedFilesFolder}. ` +
      `Command: ${command}. ` +
      `Error: ${error.message}. ` +
      'Please ensure the extraction completed successfully and the file exists.'
    );
  }

  if (!fileName) {
    // List all files in the directory for debugging
    let allFiles: string[] = [];
    try {
      allFiles = fs.readdirSync(extractedFilesFolder);
    } catch (error: any) {
      console.error('[FileSystem] Failed to list files in directory:', error.message);
    }

    throw new Error(
      `No extracted file found for item type '${itemType}' in folder: ${extractedFilesFolder}. ` +
      `Command: ${command}. ` +
      `Files in directory: [${allFiles.join(', ')}]. ` +
      'Please ensure the extraction completed successfully.'
    );
  }

  const fullPath = path.join(extractedFilesFolder, fileName);

  console.log(`[FileSystem] Found extracted file: ${fullPath}`);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Extracted file path does not exist: ${fullPath}. ` +
      'This is unexpected as the file was found by the ls command.'
    );
  }

  return fullPath;
}

/**
 * Copy a file to a destination
 * @param sourcePath Source file path
 * @param destPath Destination file path
 */
export function copyFile(sourcePath: string, destPath: string): void {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(
      `Source file not found at path: ${sourcePath}. ` +
      'Cannot copy file.'
    );
  }

  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, destPath);
    console.log(`[FileSystem] Copied file from ${sourcePath} to ${destPath}`);
  } catch (error: any) {
    throw new Error(
      `Failed to copy file from ${sourcePath} to ${destPath}. ` +
      `Error: ${error.message}`
    );
  }
}