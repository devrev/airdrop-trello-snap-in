import { spawn } from 'child_process';

/**
 * Validates the external domain metadata using Chef CLI
 * @param metadata The metadata to validate
 * @returns A promise that resolves if validation is successful, rejects with error otherwise
 */
export async function validateMetadataWithChefCLI(metadata: Record<string, any>): Promise<void> {
  return new Promise((resolve, reject) => {
    const chefCliPath = process.env.CHEF_CLI_PATH;
    
    if (!metadata) {
      reject(new Error('Metadata is undefined or null'));
      return;
    }
    
    if (!chefCliPath) {
      reject(new Error('CHEF_CLI_PATH environment variable is not set'));
      return;
    }

    const chefProcess = spawn(chefCliPath, ['validate-metadata']);
    let stdout = '';
    let stderr = '';

    chefProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`Chef CLI stdout: ${data}`);
    });

    chefProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`Chef CLI stderr: ${data}`);
    });

    chefProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Chef CLI validation failed with code ${code}. Stderr: ${stderr}`));
      } else if (stdout.trim() !== '') {
        reject(new Error(`Chef CLI validation failed. Output: ${stdout}`));
      } else {
        resolve();
      }
    });

    // Write metadata to stdin
    chefProcess.stdin.write(JSON.stringify(metadata));
    chefProcess.stdin.end();
  });
}