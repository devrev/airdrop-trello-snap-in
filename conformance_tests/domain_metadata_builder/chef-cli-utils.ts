import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Validates metadata using the Chef CLI tool
 * 
 * @param metadata - The metadata object to validate
 * @returns Promise that resolves with validation result
 */
export async function validateWithChefCli(metadata: any): Promise<{ 
  success: boolean; 
  message: string; 
  output?: string;
  error?: string;
}> {
  // Check if Chef CLI path is provided
  const chefCliPath = process.env.CHEF_CLI_PATH;
  if (!chefCliPath) {
    return {
      success: false,
      message: 'CHEF_CLI_PATH environment variable is not set',
      error: 'Chef CLI path not provided'
    };
  }

  // Check if Chef CLI exists
  if (!fs.existsSync(chefCliPath)) {
    return {
      success: false,
      message: `Chef CLI not found at path: ${chefCliPath}`,
      error: 'Chef CLI executable not found'
    };
  }

  try {
    // Create a temporary file to store the metadata
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `metadata-${Date.now()}.json`);
    
    // Write metadata to the temporary file
    fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2));
    
    // Execute Chef CLI command
    const command = `cat ${tempFilePath} | ${chefCliPath} validate-metadata`;
    
    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        // Clean up the temporary file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary file:', cleanupError);
        }
        
        if (error) {
          resolve({
            success: false,
            message: `Chef CLI validation failed with exit code ${error.code}`,
            output: stdout,
            error: stderr
          });
          return;
        }
        
        // If stdout is empty, validation was successful
        if (!stdout.trim()) {
          resolve({
            success: true,
            message: 'Chef CLI validation successful',
            output: stdout
          });
        } else {
          resolve({
            success: false,
            message: 'Chef CLI validation failed',
            output: stdout,
            error: stderr
          });
        }
      });
    });
  } catch (error) {
    return {
      success: false,
      message: `Error executing Chef CLI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: String(error)
    };
  }
}