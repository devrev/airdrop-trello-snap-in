import {
  readCredentials,
  buildConnectionDataKey,
  setupCallbackServer,
  sendEventToSnapIn,
  waitForCallbackEvent,
} from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Validate Cards Normalization - Acceptance Test', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  test('should validate cards normalization with Chef CLI', async () => {
    // Step 1: Read credentials and environment variables
    const { apiKey, token, orgId } = readCredentials();
    
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
    if (!extractedFilesFolderPath) {
      throw new Error(
        'EXTRACTED_FILES_FOLDER_PATH environment variable is not set. ' +
        'This variable must point to the folder where extraction artifacts are stored. ' +
        'Please set this environment variable before running the test.'
      );
    }

    // Setup callback server
    const { eventPromise, cleanup: cleanupServer } = setupCallbackServer(8002);
    cleanup = cleanupServer;

    // Step 2: Load and modify test payload
    console.log('Loading test payload...');
    const payloadPath = path.join(__dirname, 'validate_cards_normalization_payload.json');
    const payloadTemplate = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

    // Replace placeholders with actual credentials
    const connectionDataKey = buildConnectionDataKey(apiKey, token);
    payloadTemplate.payload.connection_data.key = connectionDataKey;
    payloadTemplate.payload.connection_data.org_id = orgId;

    // Step 3: Send event to snap-in server
    console.log('Sending EXTRACTION_DATA_START event to snap-in server...');
    await sendEventToSnapIn(payloadTemplate);

    // Step 4: Wait for callback event
    console.log('Waiting for EXTRACTION_DATA_DONE callback event...');
    const callbackEvent = await waitForCallbackEvent(eventPromise, 100000);

    if (!callbackEvent) {
      throw new Error(
        'No callback event received from DevRev. ' +
        'Expected to receive an EXTRACTION_DATA_DONE event after extraction completes. ' +
        'This indicates the extraction function may have failed or timed out. ' +
        'Check the extraction function logs for errors.'
      );
    }

    console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));

    // Verify event type is EXTRACTION_DATA_DONE
    const eventType = callbackEvent.event_type;
    if (eventType !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DONE', but got '${eventType}'. ` +
        'The extraction must complete successfully before normalization can be validated. ' +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    console.log('✓ Extraction completed successfully');

    // Step 5: Verify Chef CLI and extracted files folder exist
    const chefCliPath = process.env.CHEF_CLI_PATH;
    if (!chefCliPath) {
      throw new Error(
        'CHEF_CLI_PATH environment variable is not set. ' +
        'This variable must point to the Chef CLI executable. ' +
        'Please set this environment variable before running the test.'
      );
    }

    // Verify extracted files folder exists (after extraction completes)
    if (!fs.existsSync(extractedFilesFolderPath)) {
      throw new Error(
        `Extracted files folder does not exist: ${extractedFilesFolderPath}. ` +
        'This folder should have been created by the extraction function. ' +
        'The extraction completed successfully (EXTRACTION_DATA_DONE received), ' +
        'but the expected folder was not created. ' +
        'This indicates the extraction function is not writing files to the expected location. ' +
        'Please verify that EXTRACTED_FILES_FOLDER_PATH points to the correct location ' +
        'and that the extraction function has write permissions to this directory.'
      );
    }

    console.log(`✓ Extracted files folder exists: ${extractedFilesFolderPath}`);

    // Step 5: Retrieve extracted file path
    console.log('Retrieving extracted file path...');
    const findFileCommand = `ls ${extractedFilesFolderPath} | grep extractor_cards | sort -r | head -n 1`;
    
    let extractedFileName: string;
    try {
      extractedFileName = execSync(findFileCommand, { encoding: 'utf-8' }).trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to retrieve extracted file name using command: ${findFileCommand}. ` +
        `Error: ${errorMessage}. ` +
        `Folder path: ${extractedFilesFolderPath}. ` +
        'This indicates that no cards extraction file was created. ' +
        'Verify that the extraction function successfully writes cards data to the file system.'
      );
    }

    if (!extractedFileName) {
      // List all files in the folder for debugging
      let filesInFolder: string[] = [];
      try {
        filesInFolder = fs.readdirSync(extractedFilesFolderPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(
          `No extracted file found matching pattern 'extractor_cards' in folder: ${extractedFilesFolderPath}. ` +
          `Additionally, failed to list files in folder. Error: ${errorMessage}`
        );
      }

      throw new Error(
        `No extracted file found matching pattern 'extractor_cards' in folder: ${extractedFilesFolderPath}. ` +
        `Files found in folder: [${filesInFolder.join(', ')}]. ` +
        'The extraction function should create a file with name containing "extractor_cards". ' +
        'Verify that the extraction function is writing cards data with the correct file naming convention.'
      );
    }

    const fullExtractedFilePath = path.join(extractedFilesFolderPath, extractedFileName);
    console.log(`✓ Found extracted file: ${fullExtractedFilePath}`);

    // Verify file exists
    if (!fs.existsSync(fullExtractedFilePath)) {
      throw new Error(
        `Extracted file does not exist at path: ${fullExtractedFilePath}. ` +
        'This is unexpected as the file name was retrieved from the folder listing. ' +
        'There may be a race condition or file system issue.'
      );
    }

    // Step 6: Prepare metadata file path
    const metadataFilePath = path.join(__dirname, 'external-domain-metadata-copy.json');
    if (!fs.existsSync(metadataFilePath)) {
      throw new Error(
        `External domain metadata file does not exist at path: ${metadataFilePath}. ` +
        'This file should be part of the test suite. ' +
        'Verify that external-domain-metadata-copy.json is present in the test directory.'
      );
    }

    // Step 7: Validate with Chef CLI
    console.log('Validating cards normalization with Chef CLI...');
    const chefCommand = `"${chefCliPath}" validate-data -m ${metadataFilePath} -r cards < ${fullExtractedFilePath}`;
    console.log(`Executing command: ${chefCommand}`);

    let stdout: string;
    let stderr: string;
    let exitCode: number;

    try {
      const result = execSync(chefCommand, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      stdout = result;
      stderr = '';
      exitCode = 0;
    } catch (error: any) {
      stdout = error.stdout ? error.stdout.toString() : '';
      stderr = error.stderr ? error.stderr.toString() : '';
      exitCode = error.status || 1;
    }

    // Print Chef CLI output for debugging
    console.log('=== Chef CLI Output ===');
    console.log('STDOUT:', stdout || '(empty)');
    console.log('STDERR:', stderr || '(empty)');
    console.log('Exit Code:', exitCode);
    console.log('======================');

    // Step 8: Validate Chef CLI output
    if (stdout.trim() !== '' || stderr.trim() !== '') {
      // Read a sample of the extracted file for debugging
      let sampleData = '';
      try {
        const fileContent = fs.readFileSync(fullExtractedFilePath, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        sampleData = lines.slice(0, 3).join('\n');
      } catch (error) {
        sampleData = '(unable to read file)';
      }

      throw new Error(
        'Chef CLI validation failed. The normalization function for cards does not produce data conforming to the external domain metadata schema.\n\n' +
        '=== Validation Failure Details ===\n' +
        `Command executed: ${chefCommand}\n` +
        `Exit code: ${exitCode}\n\n` +
        `STDOUT:\n${stdout || '(empty)'}\n\n` +
        `STDERR:\n${stderr || '(empty)'}\n\n` +
        `Extracted file: ${fullExtractedFilePath}\n` +
        `Metadata file: ${metadataFilePath}\n\n` +
        `Sample of extracted data (first 3 lines):\n${sampleData}\n\n` +
        '=== What This Means ===\n' +
        'The cards normalization function in data-extraction-utils.ts is producing data that does not match the schema defined in external-domain-metadata.json.\n' +
        'Common issues:\n' +
        '1. Field types do not match (e.g., string instead of array, number instead of string)\n' +
        '2. Required fields are missing (id, created_date, modified_date)\n' +
        '3. Enum values do not match defined values (e.g., invalid stage value)\n' +
        '4. Rich text fields are not arrays of strings\n' +
        '5. Timestamp fields are not in RFC3339 format\n' +
        '6. Reference fields contain invalid values\n\n' +
        '=== How to Fix ===\n' +
        '1. Review the Chef CLI output above for specific validation errors\n' +
        '2. Check the normalizeCard function in data-extraction-utils.ts\n' +
        '3. Verify that all fields match the types defined in external-domain-metadata.json\n' +
        '4. Ensure created_date and modified_date are properly formatted ISO 8601 timestamps\n' +
        '5. Verify that enum fields (like stage) only use allowed values\n' +
        '6. Ensure rich text fields (like body) are arrays of strings, not plain strings\n'
      );
    }

    console.log('✓ Chef CLI validation passed - normalization is correct');
    console.log('✓ All cards data conforms to the external domain metadata schema');
  }, 120000); // 120 second timeout
});