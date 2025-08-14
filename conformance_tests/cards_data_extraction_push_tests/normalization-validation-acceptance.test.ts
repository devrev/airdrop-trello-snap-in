import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';
import { invokeExternalDomainMetadataFunction } from './utils/test-helpers';

describe('Normalization Function Validation Test', () => {
  const callbackServer = new CallbackServer();
  let tempMetadataFile: string;
  
  beforeAll(async () => {
    await callbackServer.start();
    
    // Check if Chef CLI is available
    const chefCliPath = process.env.CHEF_CLI_PATH;
    if (!chefCliPath) {
      throw new Error('Missing required environment variable: CHEF_CLI_PATH');
    }
    
    if (!fs.existsSync(chefCliPath)) {
      throw new Error(`Chef CLI executable not found at path: ${chefCliPath}`);
    }
    
    // Create a temporary file for metadata
    tempMetadataFile = path.join(process.cwd(), 'temp_metadata.json');
  });
  
  afterAll(async () => {
    await callbackServer.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clean up temporary file
    if (fs.existsSync(tempMetadataFile)) {
      fs.unlinkSync(tempMetadataFile);
    }
  });
  
  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('should validate cards normalization function with Chef CLI', async () => {
    // Check required environment variables
    const extractedFilesFolder = process.env.EXTRACTED_FILES_FOLDER_PATH;
    const chefCliPath = process.env.CHEF_CLI_PATH;
    
    if (!extractedFilesFolder) {
      throw new Error('Missing required environment variable: EXTRACTED_FILES_FOLDER_PATH');
    }
    
    if (!chefCliPath) {
      throw new Error('Missing required environment variable: CHEF_CLI_PATH');
    }
    
    // Step 1: Invoke extraction function to generate extracted files
    console.log('Step 1: Invoking extraction function to generate extracted files...');
    
    // Read test data from JSON file
    const testDataPath = path.resolve(__dirname, './test-data/data_extraction_test.json');
    
    if (!fs.existsSync(testDataPath)) {
      throw new Error(`Test data file not found at path: ${testDataPath}`);
    }
    
    const testDataRaw = fs.readFileSync(testDataPath, 'utf8');
    const testData = JSON.parse(testDataRaw);
    
    if (!testData || !Array.isArray(testData) || testData.length === 0) {
      throw new Error('Invalid test data format: expected non-empty array');
    }
    
    // Get credentials from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!apiKey) {
      throw new Error('Missing required environment variable: TRELLO_API_KEY');
    }
    if (!token) {
      throw new Error('Missing required environment variable: TRELLO_TOKEN');
    }
    if (!orgId) {
      throw new Error('Missing required environment variable: TRELLO_ORGANIZATION_ID');
    }

    // Replace placeholders in the test data
    const event = testData[0]; // Get the first event from the array
    
    // Replace placeholders in connection_data
    if (event.payload && event.payload.connection_data) {
      const connectionData = event.payload.connection_data;
      connectionData.key = connectionData.key
        .replace('<TRELLO_API_KEY>', apiKey)
        .replace('<TRELLO_TOKEN>', token);
      connectionData.org_id = connectionData.org_id
        .replace('<TRELLO_ORGANIZATION_ID>', orgId);
    } else {
      throw new Error('Invalid test data: missing payload.connection_data');
    }
    
    // Update callback URL to point to our test server
    if (event.payload && event.payload.event_context) {
      event.payload.event_context.callback_url = 'http://localhost:8002/callback';
    } else {
      throw new Error('Invalid test data: missing payload.event_context');
    }
    
    // Send event to Snap-In Server
    console.log('Sending extraction event to Snap-In Server...');
    try {
      await snapInClient.post('/handle/sync', event);
    } catch (error: any) {
      console.error('Error sending extraction event to Snap-In Server:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
    
    // Wait for callback to be received (with timeout)
    console.log('Waiting for extraction callback response...');
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const events = callbackServer.getEvents();
      if (events.length > 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Verify extraction was successful
    const events = callbackServer.getEvents();
    console.log(`Received ${events.length} callback events`);
    
    if (events.length === 0) {
      throw new Error('No callback events received within timeout period');
    }
    
    const callbackEvent = events[0];
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Step 2: Get external domain metadata
    console.log('Step 2: Getting external domain metadata...');
    
    const metadataResult = await invokeExternalDomainMetadataFunction();
    console.log('External domain metadata function response received');
    
    // Extract metadata from the nested structure
    if (!metadataResult || !metadataResult.function_result) {
      console.error('Invalid metadata result structure:', JSON.stringify(metadataResult));
      throw new Error('Failed to retrieve external domain metadata: Invalid response structure');
    }
    
    const functionResult = metadataResult.function_result;
    if (functionResult.status === 'error') {
      throw new Error(`Failed to retrieve external domain metadata: ${functionResult.message}`);
    }
    
    if (!functionResult.metadata) {
      console.error('Metadata not found in response:', JSON.stringify(functionResult));
      throw new Error('Failed to retrieve external domain metadata: Metadata not found in response');
    } else {
        // Save metadata to temporary file
        fs.writeFileSync(tempMetadataFile, JSON.stringify(functionResult.metadata, null, 2));
        console.log(`Saved metadata to temporary file: ${tempMetadataFile}`);
    
    // Step 3: Check if extracted files folder exists
    if (!process.env.EXTRACTED_FILES_FOLDER_PATH) {
      throw new Error('Missing required environment variable: EXTRACTED_FILES_FOLDER_PATH');
    }
    console.log('Step 3: Checking if extracted files folder exists...');
    
    if (!fs.existsSync(extractedFilesFolder)) {
      throw new Error(`Extracted files folder not found at path: ${extractedFilesFolder}`);
    }
    
    // Step 4: Find the most recent cards extraction file
    console.log('Step 4: Finding the most recent cards extraction file...');
    
    let extractedCardFile;
    try {      
      const command = `ls ${extractedFilesFolder} | grep extractor_cards | sort -r | head -n 1`;
      extractedCardFile = execSync(command).toString().trim();
      
      if (!extractedCardFile) {
        throw new Error('No cards extraction file found');
      }
      
      console.log(`Found cards extraction file: ${extractedCardFile}`);
    } catch (error) {
      throw new Error(`Failed to find cards extraction file in ${extractedFilesFolder}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const extractedCardFilePath = path.join(extractedFilesFolder, extractedCardFile);
    
    if (!fs.existsSync(extractedCardFilePath)) {
      throw new Error(`Cards extraction file not found at path: ${extractedCardFilePath}`);
    }
    
    // Step 5: Run Chef CLI validation
    console.log('Step 5: Running Chef CLI validation...');
    
    try {
      const command = `cat ${extractedCardFilePath} | ${chefCliPath} validate-data -m ${tempMetadataFile} -r cards`;
      console.log(`Executing command: ${command}`);
      
      const output = execSync(command, { stdio: 'pipe' }).toString();
      
      // Log the output for debugging
      console.log('Chef CLI Output:');
      console.log(output);
      
      // Validation is successful if output is empty
      expect(output.trim()).toBe('');
      
    } catch (error: any) {
      console.error('Chef CLI validation failed:');
      if (error.stdout) console.error('stdout:', error.stdout.toString());
      if (error.stderr) console.error('stderr:', error.stderr.toString());
      
      throw new Error(`Chef CLI validation failed: ${error.message}`);
    }
    
    console.log('Cards normalization validation completed successfully');
  }
  }, 120000); // 120 second timeout for this test
});