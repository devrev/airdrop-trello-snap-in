/**
 * Acceptance test for validating users data normalization with Chef CLI
 * 
 * This test verifies that:
 * 1. Users data is extracted correctly
 * 2. The extracted data file is created in the expected location
 * 3. The normalization function produces valid output according to the external domain metadata
 * 4. Chef CLI validation passes with empty stdout and stderr
 */

import * as fs from 'fs';
import * as path from 'path';
import { CallbackServer } from './test-utils/callback-server';
import { getTrelloCredentials } from './test-utils/environment';
import { sendEventToSnapIn } from './test-utils/snap-in-client';
import { findExtractedFile } from './test-utils/file-system';
import { validateWithChefCli } from './test-utils/chef-cli';

describe('Normalization Validation - Users', () => {
  let callbackServer: CallbackServer;
  const CALLBACK_TIMEOUT_MS = 90000; // 90 seconds

  beforeAll(async () => {
    // Start callback server
    callbackServer = new CallbackServer();
    await callbackServer.start(8002);
  });

  afterAll(async () => {
    // Stop callback server
    await callbackServer.stop();
  });

  beforeEach(() => {
    // Clear events before each test
    callbackServer.clearEvents();
  });

  it('should validate users normalization function with Chef CLI', async () => {
    console.log('[Test] Step 1: Invoking extraction function');

    // Step 1: Load test payload
    const payloadPath = path.join(__dirname, 'test-payloads', 'data_extraction_test.json');
    
    if (!fs.existsSync(payloadPath)) {
      throw new Error(
        `Test payload file not found at: ${payloadPath}. ` +
        'Please ensure the file exists and the path is correct.'
      );
    }

    const payloadContent = fs.readFileSync(payloadPath, 'utf-8');
    const payload = JSON.parse(payloadContent);

    // Get credentials from environment
    let credentials;
    try {
      credentials = getTrelloCredentials();
    } catch (error) {
      throw new Error(
        `Failed to read Trello credentials from environment: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Please ensure TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_ORGANIZATION_ID are set.'
      );
    }

    // Replace placeholder credentials with actual values
    const connectionKey = `key=${credentials.apiKey}&token=${credentials.token}`;
    payload.payload.connection_data.key = connectionKey;
    payload.payload.connection_data.org_id = credentials.organizationId;

    // Send event to snap-in server
    const response = await sendEventToSnapIn(payload);

    // Check for errors in snap-in response
    if (response.error) {
      throw new Error(
        `Snap-in server returned error: ${JSON.stringify(response.error, null, 2)}. ` +
        'This indicates the snap-in failed to process the event. ' +
        `Full response: ${JSON.stringify(response, null, 2)}`
      );
    }

    console.log('[Test] Waiting for extraction to complete');

    // Wait for callback event
    let callbackEvent;
    try {
      callbackEvent = await callbackServer.waitForEvent(CALLBACK_TIMEOUT_MS);
    } catch (error) {
      const receivedEvents = callbackServer.getReceivedEvents();
      throw new Error(
        `Failed to receive callback event: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Received ${receivedEvents.length} events total. ` +
        `Events: ${JSON.stringify(receivedEvents, null, 2)}`
      );
    }

    // Verify extraction completed successfully
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DONE', but got '${callbackEvent.event_type}'. ` +
        'Extraction must complete successfully before validation. ' +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    console.log('[Test] Step 2: Retrieving extracted file path');

    // Step 2: Find the extracted file
    let extractedFilePath: string;
    try {
      extractedFilePath = findExtractedFile('users');
    } catch (error) {
      throw new Error(
        `Failed to find extracted file: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Please ensure EXTRACTED_FILES_FOLDER_PATH is set correctly and the extraction completed successfully.'
      );
    }

    console.log(`[Test] Found extracted file: ${extractedFilePath}`);

    console.log('[Test] Step 3: Preparing metadata file for validation');

    // Step 3: Get metadata file path
    const metadataPath = path.join(__dirname, 'test-metadata', 'external-domain-metadata.json');

    if (!fs.existsSync(metadataPath)) {
      throw new Error(
        `Metadata file not found at: ${metadataPath}. ` +
        'Please ensure the metadata file exists in the test-metadata directory.'
      );
    }

    console.log(`[Test] Using metadata file: ${metadataPath}`);

    console.log('[Test] Step 4: Validating normalization with Chef CLI');

    // Step 4: Validate with Chef CLI
    let validationResult;
    try {
      validationResult = validateWithChefCli(metadataPath, 'users', extractedFilePath);
    } catch (error) {
      throw new Error(
        `Failed to execute Chef CLI validation: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Please ensure CHEF_CLI_PATH is set correctly and points to a valid executable.'
      );
    }

    console.log('[Test] Chef CLI validation completed');
    console.log('[Test] Command:', validationResult.command);
    console.log('[Test] stdout:', validationResult.stdout || '(empty)');
    console.log('[Test] stderr:', validationResult.stderr || '(empty)');

    // Verify validation succeeded
    expect(validationResult.success).toBe(true);
    
    if (!validationResult.success) {
      throw new Error(
        'Chef CLI validation failed. The normalization function for users does not produce valid output. ' +
        `Command: ${validationResult.command}\n` +
        `stdout: ${validationResult.stdout || '(empty)'}\n` +
        `stderr: ${validationResult.stderr || '(empty)'}\n` +
        'Expected: Both stdout and stderr should be empty for successful validation.\n' +
        'Action required: Fix the normalization function in the implementation to match the external domain metadata specification.'
      );
    }

    // Verify stdout is empty
    expect(validationResult.stdout.trim()).toBe('');
    
    if (validationResult.stdout.trim() !== '') {
      throw new Error(
        'Chef CLI validation produced output on stdout. Validation is only successful when stdout is empty. ' +
        `stdout: ${validationResult.stdout}\n` +
        'This indicates the normalization function produces invalid data. ' +
        'Action required: Review the stdout output and fix the normalization function accordingly.'
      );
    }

    // Verify stderr is empty
    expect(validationResult.stderr.trim()).toBe('');
    
    if (validationResult.stderr.trim() !== '') {
      throw new Error(
        'Chef CLI validation produced output on stderr. Validation is only successful when stderr is empty. ' +
        `stderr: ${validationResult.stderr}\n` +
        'This indicates an error occurred during validation. ' +
        'Action required: Review the stderr output and fix the normalization function accordingly.'
      );
    }

    console.log('[Test] ✓ All validations passed successfully');
    console.log('[Test] ✓ Users normalization function produces valid output according to external domain metadata');
  });
});