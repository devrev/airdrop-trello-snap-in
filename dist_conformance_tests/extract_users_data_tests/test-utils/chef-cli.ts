/**
 * Utility for executing Chef CLI validation commands
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

export interface ChefCliValidationResult {
  success: boolean;
  stdout: string;
  stderr: string;
  command: string;
}

/**
 * Validate extracted data using Chef CLI
 * @param metadataPath Path to the external domain metadata JSON file
 * @param recordType The record type to validate (e.g., 'users')
 * @param extractedFilePath Path to the extracted data file
 * @returns Validation result with stdout, stderr, and success status
 */
export function validateWithChefCli(
  metadataPath: string,
  recordType: string,
  extractedFilePath: string
): ChefCliValidationResult {
  const chefCliPath = process.env.CHEF_CLI_PATH;

  if (!chefCliPath) {
    throw new Error(
      'Missing required environment variable: CHEF_CLI_PATH. ' +
      'Please set CHEF_CLI_PATH to the path of the Chef CLI executable.'
    );
  }

  if (!fs.existsSync(chefCliPath)) {
    throw new Error(
      `Chef CLI executable not found at path: ${chefCliPath}. ` +
      'Please ensure CHEF_CLI_PATH points to a valid executable.'
    );
  }

  if (!fs.existsSync(metadataPath)) {
    throw new Error(
      `Metadata file not found at path: ${metadataPath}. ` +
      'Please ensure the metadata file exists.'
    );
  }

  if (!fs.existsSync(extractedFilePath)) {
    throw new Error(
      `Extracted file not found at path: ${extractedFilePath}. ` +
      'Please ensure the extraction completed successfully.'
    );
  }

  // Construct the validation command
  const command = `"${chefCliPath}" validate-data -m "${metadataPath}" -r ${recordType} < "${extractedFilePath}"`;

  console.log('[ChefCli] Executing validation command:', command);

  let stdout = '';
  let stderr = '';
  let success = false;

  try {
    // Execute the command and capture output
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    stdout = output.toString();
    
    // Validation is successful when both stdout and stderr are empty
    success = stdout.trim() === '';

    console.log('[ChefCli] Command executed successfully');
    console.log('[ChefCli] stdout:', stdout || '(empty)');
    console.log('[ChefCli] stderr:', stderr || '(empty)');
  } catch (error: any) {
    // execSync throws an error if the command exits with non-zero status
    stdout = error.stdout ? error.stdout.toString() : '';
    stderr = error.stderr ? error.stderr.toString() : '';
    success = false;

    console.error('[ChefCli] Command failed with error');
    console.error('[ChefCli] stdout:', stdout || '(empty)');
    console.error('[ChefCli] stderr:', stderr || '(empty)');
    console.error('[ChefCli] Error message:', error.message);
  }

  return {
    success,
    stdout,
    stderr,
    command,
  };
}