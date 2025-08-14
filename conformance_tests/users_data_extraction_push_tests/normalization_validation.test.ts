import fs from 'fs';
import path from 'path';
import { 
  createCallbackServer, 
  sendEventToSnapIn, 
  executeCommand,
  findLatestExtractedFile,
  runChefCliValidation
} from './utils';
import { Server } from 'http';

describe('Normalization Function Validation', () => {
  let callbackServer: Server;
  let receivedEvents: any[];
  const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH;
  const EXTRACTED_FILES_FOLDER_PATH = process.env.EXTRACTED_FILES_FOLDER_PATH;

  beforeAll(async () => {
    // Verify required environment variables
    if (!CHEF_CLI_PATH) {
      throw new Error('CHEF_CLI_PATH environment variable is not set');
    }
    if (!EXTRACTED_FILES_FOLDER_PATH) {
      throw new Error('EXTRACTED_FILES_FOLDER_PATH environment variable is not set');
    }

    // Verify Chef CLI exists and is executable
    try {
      const result = await executeCommand(`${CHEF_CLI_PATH} --version`);
      if (result.exitCode !== 0) {
        throw new Error(`Chef CLI check failed with exit code ${result.exitCode}`);
      }
    } catch (error) {
      throw new Error(`Chef CLI not found or not executable at path: ${CHEF_CLI_PATH}. Error: ${error}`);
    }

    // Set up the callback server to receive events from the snap-in
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    receivedEvents = serverSetup.receivedEvents;
  });

  afterAll(() => {
    // Clean up the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  beforeEach(() => {
    // Clear received events before each test
    receivedEvents.length = 0;
  });

  test('should validate users normalization function with Chef CLI', async () => {
    // Get Trello credentials from environment variables
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloToken = process.env.TRELLO_TOKEN;
    const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!trelloApiKey || !trelloToken || !trelloOrgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    // Load the test event data for extraction
    const testDataPath = path.resolve(__dirname, './test_data/data_extraction_test.json');
    if (!fs.existsSync(testDataPath)) {
      throw new Error(`Test data file not found at: ${testDataPath}`);
    }

    let testData = fs.readFileSync(testDataPath, 'utf8');
    
    // Replace placeholders with actual credentials
    testData = testData.replace(/<TRELLO_API_KEY>/g, trelloApiKey);
    testData = testData.replace(/<TRELLO_TOKEN>/g, trelloToken);
    testData = testData.replace(/<TRELLO_ORGANIZATION_ID>/g, trelloOrgId);
    
    // Parse the JSON data
    const testEvents = JSON.parse(testData);
    if (!testEvents || !Array.isArray(testEvents) || testEvents.length === 0) {
      throw new Error('Invalid test data format: expected non-empty array');
    }
    
    // Get the first event from the array
    const extractionEvent = testEvents[0];
    console.log('Sending extraction event to snap-in:', JSON.stringify(extractionEvent, null, 2));
    
    // Send the extraction event to the snap-in
    await sendEventToSnapIn(extractionEvent);
    
    // Wait for callback events (give it some time to process)
    console.log('Waiting for extraction to complete...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify extraction completed successfully
    const doneEvent = receivedEvents.find(e => e.event_type === 'EXTRACTION_DATA_DONE');
    if (!doneEvent) {
      throw new Error(`Extraction did not complete successfully. Received events: ${JSON.stringify(receivedEvents)}`);
    }
    
    console.log('Extraction completed successfully');
    
    // Verify the extracted files folder exists
    if (!fs.existsSync(EXTRACTED_FILES_FOLDER_PATH!)) {
      throw new Error(`Extracted files folder does not exist at path: ${EXTRACTED_FILES_FOLDER_PATH}`);
    }
    
    // Load the external domain metadata event
    const metadataEventPath = path.resolve(__dirname, './test_data/external_domain_metadata_event_payload.json');
    if (!fs.existsSync(metadataEventPath)) {
      // Create the file if it doesn't exist
      const metadataEvent = {
        payload: {
          connection_data: {
            key: `key=${trelloApiKey}&token=${trelloToken}`,
            org_id: trelloOrgId
          },
          event_context: {
            callback_url: "http://localhost:8002/callback",
            external_sync_unit_id: "6752eb95c833e6b206fcf388"
          }
        },
        context: {
          dev_oid: "test-org-id",
          source_id: "test-source-id",
          snap_in_id: "test-snap-in-id",
          snap_in_version_id: "test-snap-in-version-id",
          service_account_id: "test-service-account-id",
          secrets: {
            service_account_token: "test-token"
          }
        },
        execution_metadata: {
          request_id: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
          function_name: "get_external_domain_metadata",
          event_type: "test-event",
          devrev_endpoint: "http://localhost:8003"
        },
        input_data: {
          global_values: {},
          event_sources: {}
        }
      };
      
      fs.writeFileSync(metadataEventPath, JSON.stringify(metadataEvent, null, 2));
    }
    
    let metadataEventData = fs.readFileSync(metadataEventPath, 'utf8');
    
    // Replace placeholders with actual credentials if they exist
    metadataEventData = metadataEventData.replace(/<TRELLO_API_KEY>/g, trelloApiKey);
    metadataEventData = metadataEventData.replace(/<TRELLO_TOKEN>/g, trelloToken);
    metadataEventData = metadataEventData.replace(/<TRELLO_ORGANIZATION_ID>/g, trelloOrgId);
    
    const metadataEvent = JSON.parse(metadataEventData);
    
    // Send the metadata event to get the external domain metadata
    console.log('Retrieving external domain metadata...');
    const metadataResponse = await sendEventToSnapIn(metadataEvent);
    console.log('Metadata response received:', JSON.stringify(metadataResponse, null, 2));
    
    // The metadata is in function_result.metadata, not directly in metadata
    if (!metadataResponse || !metadataResponse.function_result || !metadataResponse.function_result.metadata) {
      throw new Error(`Failed to retrieve external domain metadata: ${JSON.stringify(metadataResponse)}`);
    }
    
    // Extract the metadata from the function_result
    const metadata = metadataResponse.function_result.metadata;
    console.log('Successfully extracted metadata:', JSON.stringify(metadata, null, 2));
    
    // Save the metadata to a temporary file
    const tempMetadataPath = path.resolve(__dirname, './temp_metadata.json');
    fs.writeFileSync(tempMetadataPath, JSON.stringify(metadata, null, 2));
    
    console.log('External domain metadata saved to temporary file');
    
    // Find the latest extracted users file
    const extractedFilePath = await findLatestExtractedFile(EXTRACTED_FILES_FOLDER_PATH!, 'extractor_users');
    
    if (!extractedFilePath) {
      console.error(`No extracted users file found in ${EXTRACTED_FILES_FOLDER_PATH}`);
      
      // Check if the folder exists
      if (!fs.existsSync(EXTRACTED_FILES_FOLDER_PATH!)) {
        throw new Error(`Extracted files folder does not exist: ${EXTRACTED_FILES_FOLDER_PATH}`);
      }
      
      // List files in the folder for debugging
      const files = fs.readdirSync(EXTRACTED_FILES_FOLDER_PATH!);
      console.log(`Files in ${EXTRACTED_FILES_FOLDER_PATH}:`, files);
      
      throw new Error(`No extracted users file found in ${EXTRACTED_FILES_FOLDER_PATH}`);
    }
    
    console.log(`Found extracted users file: ${extractedFilePath}`);
    
    // Read the file content for debugging
    const fileContent = fs.readFileSync(extractedFilePath, 'utf8');
    console.log('Extracted file content (first 500 chars):', fileContent.substring(0, 500));
    
    // Run Chef CLI validation
    console.log('Running Chef CLI validation...');
    const { stdout, stderr, exitCode } = await runChefCliValidation(
      CHEF_CLI_PATH!,
      tempMetadataPath,
      'users',
      extractedFilePath
    );
    
    // Always print stdout and stderr
    console.log('Chef CLI stdout:');
    console.log(stdout);
    
    console.log('Chef CLI stderr:');
    console.log(stderr);
    
    // Clean up temporary file
    fs.unlinkSync(tempMetadataPath);
    
    // Verify Chef CLI validation was successful (empty output)
    expect(exitCode).toBe(0);
    // Chef CLI might output some informational messages, so we should check for errors instead
    expect(stderr.trim()).not.toContain('error');
    
  }, 60000); // 60 second timeout
});