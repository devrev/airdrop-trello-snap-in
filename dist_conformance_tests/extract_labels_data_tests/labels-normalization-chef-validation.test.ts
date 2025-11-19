import { CallbackServer, loadTestPayload, invokeSnapIn, executeChefValidation } from './helpers/test-helpers';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

describe('Labels Data Extraction - Chef CLI Normalization Validation', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    callbackServer = new CallbackServer(8002);
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('should validate labels normalization using Chef CLI', async () => {
    console.log('=== Starting Chef CLI Validation Test for Labels ===');

    // Step 1: Verify required environment variables
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
    if (!extractedFilesFolderPath) {
      throw new Error(
        'EXTRACTED_FILES_FOLDER_PATH environment variable is not set. ' +
        'Please set it to the folder containing extracted files. ' +
        'Example: export EXTRACTED_FILES_FOLDER_PATH=/path/to/extracted/files'
      );
    }
    console.log(`Extracted files folder path: ${extractedFilesFolderPath}`);

    const chefCliPath = process.env.CHEF_CLI_PATH;
    if (!chefCliPath) {
      throw new Error(
        'CHEF_CLI_PATH environment variable is not set. ' +
        'Please set it to the path of the Chef CLI executable. ' +
        'Example: export CHEF_CLI_PATH=/path/to/chef-cli'
      );
    }
    console.log(`Chef CLI path: ${chefCliPath}`);

    // Verify Chef CLI exists and is executable
    if (!fs.existsSync(chefCliPath)) {
      throw new Error(
        `Chef CLI executable not found at path: ${chefCliPath}. ` +
        'Please verify the CHEF_CLI_PATH environment variable points to a valid executable.'
      );
    }
    console.log('Chef CLI executable found');

    // Step 2: Load test payload with actual credentials
    console.log('Loading test payload...');
    const payload = loadTestPayload('data_extraction_test.json');
    console.log('Test payload loaded successfully');

    // Step 3: Invoke the extraction function
    console.log('Invoking extraction function...');
    await invokeSnapIn(payload);
    console.log('Extraction function invoked successfully');

    // Step 4: Wait for the callback event indicating extraction completion
    console.log('Waiting for EXTRACTION_DATA_DONE callback event...');
    const callbackEvent = await callbackServer.waitForEvent('EXTRACTION_DATA_DONE', 60000);
    console.log('Received EXTRACTION_DATA_DONE event');

    // Verify extraction completed successfully
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Step 5: Verify extracted files folder exists
    if (!fs.existsSync(extractedFilesFolderPath)) {
      throw new Error(
        `Extracted files folder does not exist: ${extractedFilesFolderPath}. ` +
        'Please verify the EXTRACTED_FILES_FOLDER_PATH environment variable is correct and the folder exists.'
      );
    }
    console.log('Extracted files folder exists');

    // Step 6: Find the most recent labels data file
    console.log('Searching for labels data file...');
    let extractedFileName: string;
    try {
      const command = `ls "${extractedFilesFolderPath}" | grep extractor_labels | sort -r | head -n 1`;
      console.log(`Executing command: ${command}`);
      extractedFileName = execSync(command, { encoding: 'utf-8' }).trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to find labels data file using command. ` +
        `Error: ${errorMessage}. ` +
        `Folder path: ${extractedFilesFolderPath}`
      );
    }

    if (!extractedFileName) {
      // List available files for debugging
      let availableFiles: string[] = [];
      try {
        availableFiles = fs.readdirSync(extractedFilesFolderPath);
      } catch (error) {
        availableFiles = ['Error reading directory'];
      }

      throw new Error(
        `No labels data file found matching pattern 'extractor_labels' in folder: ${extractedFilesFolderPath}. ` +
        `Available files: [${availableFiles.join(', ')}]. ` +
        'Please verify that data extraction completed successfully and created the labels file.'
      );
    }

    const fullExtractedFilePath = path.join(extractedFilesFolderPath, extractedFileName);
    console.log(`Found labels data file: ${fullExtractedFilePath}`);

    // Verify the file exists and is readable
    if (!fs.existsSync(fullExtractedFilePath)) {
      throw new Error(
        `Labels data file does not exist at path: ${fullExtractedFilePath}. ` +
        'This should not happen as the file was just found. Please check file system permissions.'
      );
    }

    try {
      fs.accessSync(fullExtractedFilePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(
        `Labels data file is not readable: ${fullExtractedFilePath}. ` +
        'Please check file permissions.'
      );
    }
    console.log('Labels data file is readable');

    // Step 7: Prepare metadata file path
    const metadataFilePath = path.join(__dirname, 'test-payloads', 'external-domain-metadata.json');
    if (!fs.existsSync(metadataFilePath)) {
      throw new Error(
        `External domain metadata file not found at: ${metadataFilePath}. ` +
        'Please verify the test-payloads folder contains external-domain-metadata.json.'
      );
    }
    console.log(`Using metadata file: ${metadataFilePath}`);

    // Step 8: Execute Chef CLI validation
    console.log('Executing Chef CLI validation...');
    console.log(`Command: "${chefCliPath}" validate-data -m "${metadataFilePath}" -r labels < "${fullExtractedFilePath}"`);

    let stdout: string;
    let stderr: string;
    let validationError: Error | null = null;

    try {
      const result = executeChefValidation(chefCliPath, metadataFilePath, 'labels', fullExtractedFilePath);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      validationError = error instanceof Error ? error : new Error('Unknown error during Chef CLI execution');
      stdout = validationError.message.includes('stdout:') 
        ? validationError.message.split('stdout:')[1].split('stderr:')[0].trim() 
        : '';
      stderr = validationError.message.includes('stderr:') 
        ? validationError.message.split('stderr:')[1].trim() 
        : validationError.message;
    }

    // Always print stdout and stderr for debugging
    console.log('=== Chef CLI Output ===');
    console.log('STDOUT:');
    if (stdout) {
      console.log(stdout);
    } else {
      console.log('(empty)');
    }
    console.log('\nSTDERR:');
    if (stderr) {
      console.log(stderr);
    } else {
      console.log('(empty)');
    }
    console.log('=== End Chef CLI Output ===');

    // Step 9: Validate that both stdout and stderr are empty
    if (stdout || stderr) {
      const errorDetails = [
        'Chef CLI validation failed. The normalization function for labels needs to be fixed.',
        '',
        'Expected: Both stdout and stderr to be empty',
        `Actual: stdout is ${stdout ? 'NOT empty' : 'empty'}, stderr is ${stderr ? 'NOT empty' : 'empty'}`,
        '',
        'Details:',
        `- Metadata file: ${metadataFilePath}`,
        `- Data file: ${fullExtractedFilePath}`,
        `- Record type: labels`,
        '',
        'STDOUT:',
        stdout || '(empty)',
        '',
        'STDERR:',
        stderr || '(empty)',
        '',
        'Action required: Review the normalization function for labels in the implementation code.',
        'The extracted data does not conform to the schema defined in external-domain-metadata.json.'
      ].join('\n');

      throw new Error(errorDetails);
    }

    // Validation successful
    expect(stdout).toBe('');
    expect(stderr).toBe('');
    console.log('✓ Chef CLI validation passed: Both stdout and stderr are empty');
    console.log('✓ Labels normalization is correct according to the schema');
  }, 120000);
});