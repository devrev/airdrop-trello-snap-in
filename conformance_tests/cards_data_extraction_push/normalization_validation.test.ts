import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  validateEnvironment, 
  setupCallbackServer,
  waitForCallbackEvent,
  sendEventToSnapIn,
  runShellCommand,
  findMostRecentExtractionFile,
  saveMetadataToTempFile
} from './utils';
import { Server } from 'http';

// Constants
const DATA_EXTRACTION_TEST_FILE = path.resolve(__dirname, 'data_extraction_test.json');
const EXTERNAL_DOMAIN_METADATA_EVENT_FILE = path.resolve(__dirname, 'external_domain_metadata_event_payload.json');

// Test timeout - allow enough time for the extraction process and validation
jest.setTimeout(120000); // 120 seconds as per requirements

describe('Trello Cards Normalization Validation Test', () => {
  let callbackServer: Server;
  let receivedEvents: any[] = [];
  let metadataFilePath: string = '';

  beforeAll(() => {
    // Validate environment variables
    validateEnvironment();
    
    // Check for additional required environment variables
    const chefCliPath = process.env.CHEF_CLI_PATH;
    if (!chefCliPath) {
      throw new Error('CHEF_CLI_PATH environment variable is not set');
    }
    
    const extractedFilesFolder = process.env.EXTRACTED_FILES_FOLDER_PATH;
    if (!extractedFilesFolder) {
      throw new Error('EXTRACTED_FILES_FOLDER_PATH environment variable is not set');
    }
    
    // Setup callback server
    const { server, events } = setupCallbackServer();
    callbackServer = server;
    receivedEvents = events;
    
    console.log('Callback server set up and listening for events');
  });

  afterAll((done) => {
    // Clean up temporary metadata file
    if (metadataFilePath && fs.existsSync(metadataFilePath)) {
      try {
        fs.unlinkSync(metadataFilePath);
        console.log(`Temporary metadata file ${metadataFilePath} deleted`);
      } catch (error) {
        console.error(`Failed to delete temporary metadata file: ${error}`);
      }
    }
    
    // Close callback server
    if (callbackServer && callbackServer.listening) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        done();
      });
    } else {
      done();
    }
  });

  test('should validate cards normalization with Chef CLI', async () => {
    // Step 1: Load and prepare the data extraction test payload
    console.log('Loading data extraction test payload...');
    const extractionPayload = loadTestPayload(DATA_EXTRACTION_TEST_FILE);
    
    // Step 2: Send extraction event to snap-in
    console.log('Sending extraction event to snap-in server...');
    const extractionResponse = await sendEventToSnapIn(extractionPayload[0]);
    
    // Verify response from snap-in
    expect(extractionResponse).toBeDefined();
    expect(extractionResponse.function_result).toBeDefined();
    expect(extractionResponse.function_result.success).toBe(true);
    expect(extractionResponse.function_result.message).toContain('Extraction process initiated');
    
    // Step 3: Wait for extraction to complete
    console.log('Waiting for EXTRACTION_DATA_DONE callback event...');
    const callbackEvent = await waitForCallbackEvent(receivedEvents, 'EXTRACTION_DATA_DONE', 60000);
    
    // Verify callback event
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Step 4: Get external domain metadata
    console.log('Loading external domain metadata event payload...');
    const metadataPayload = loadTestPayload(EXTERNAL_DOMAIN_METADATA_EVENT_FILE);
    
    console.log('Sending metadata request to snap-in server...');
    const metadataResponse = await sendEventToSnapIn(metadataPayload);
    
    // Verify metadata response
    expect(metadataResponse).toBeDefined();
    expect(metadataResponse.function_result).toBeDefined();
    expect(metadataResponse.function_result.success).toBe(true);
    expect(metadataResponse.function_result.metadata).toBeDefined();
    
    // Step 5: Save metadata to temporary file
    metadataFilePath = await saveMetadataToTempFile(metadataResponse.function_result.metadata);
    console.log(`Metadata saved to temporary file: ${metadataFilePath}`);
    
    // Step 6: Check if extracted files folder exists
    const extractedFilesFolder = process.env.EXTRACTED_FILES_FOLDER_PATH!;
    if (!fs.existsSync(extractedFilesFolder)) {
      throw new Error(`Extracted files folder ${extractedFilesFolder} does not exist after extraction`);
    }
    
    // Step 7: Find the most recent cards extraction file
    const cardsFile = await findMostRecentExtractionFile(extractedFilesFolder, 'cards');
    if (!cardsFile) {
      throw new Error(`No cards extraction file found in ${extractedFilesFolder}`);
    }
    console.log(`Found cards extraction file: ${cardsFile}`);
    
    // Step 8: Run Chef CLI validation
    const chefCliPath = process.env.CHEF_CLI_PATH!;
    const validationCommand = `cat "${cardsFile}" | "${chefCliPath}" validate-data -m "${metadataFilePath}" -r cards`;
    
    console.log(`Running Chef CLI validation command: ${validationCommand}`);
    const { stdout, stderr, exitCode } = await runShellCommand(validationCommand);
    
    // Always print Chef CLI output
    console.log('Chef CLI stdout:');
    console.log(stdout);
    
    if (stderr) {
      console.error('Chef CLI stderr:');
      console.error(stderr);
    }
    
    // Step 9: Verify Chef CLI validation result
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe(''); // Empty output indicates successful validation
    
    console.log('Chef CLI validation completed successfully');
  });
});

/**
 * Load test payload from JSON file and replace placeholders with actual credentials
 */
function loadTestPayload(filePath: string): any {
  try {
    // Read test data file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse JSON
    let testData = JSON.parse(fileContent);
    
    // Get credentials from environment
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;
    
    if (!apiKey || !token || !orgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_ORGANIZATION_ID');
    }
    
    // Handle both array and single object formats
    const isArray = Array.isArray(testData);
    if (!isArray) {
      testData = [testData];
    }
    
    // Replace placeholders in test data
    testData.forEach((event: any) => {
      if (event.payload && event.payload.connection_data) {
        event.payload.connection_data.key = event.payload.connection_data.key
          .replace('<TRELLO_API_KEY>', apiKey)
          .replace('<TRELLO_TOKEN>', token);
        
        if (event.payload.connection_data.org_id) {
          event.payload.connection_data.org_id = event.payload.connection_data.org_id
            .replace('<TRELLO_ORGANIZATION_ID>', orgId);
        }
      }
    });
    
    return isArray ? testData : testData[0];
  } catch (error) {
    console.error('Error loading test payload:', error);
    throw new Error(`Failed to load test payload from ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}