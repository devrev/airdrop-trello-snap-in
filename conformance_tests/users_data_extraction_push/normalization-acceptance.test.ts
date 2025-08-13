import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { 
  sendEventToSnapIn, 
  createCallbackServer,
  TRELLO_API_KEY, 
  TRELLO_TOKEN, 
  TRELLO_ORGANIZATION_ID,
  CALLBACK_SERVER_URL,
  DEVREV_SERVER_URL
} from './utils/test-helpers';

const execPromise = promisify(exec);

// Environment variables with default values for testing
const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';
const EXTRACTED_FILES_FOLDER_PATH = process.env.EXTRACTED_FILES_FOLDER_PATH || './extracted_files';

// Check if required environment variables are set
beforeAll(() => {
  // Verify environment variables are set
  if (!TRELLO_API_KEY || TRELLO_API_KEY.trim() === '') {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!TRELLO_TOKEN) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!TRELLO_ORGANIZATION_ID) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }
  if (!CHEF_CLI_PATH || CHEF_CLI_PATH.trim() === '') {
    throw new Error('CHEF_CLI_PATH environment variable is not set');
  }
  if (!EXTRACTED_FILES_FOLDER_PATH || EXTRACTED_FILES_FOLDER_PATH.trim() === '') {
    throw new Error('EXTRACTED_FILES_FOLDER_PATH environment variable is not set');
  }

  // Verify Chef CLI exists
  if (!fs.existsSync(CHEF_CLI_PATH)) {
    throw new Error(`Chef CLI not found at path: ${CHEF_CLI_PATH}`);
  }
});

/**
 * Get the latest extracted users file
 */
async function getLatestExtractedUsersFile(): Promise<string> {
  try {
    // Check if extracted files folder exists (using non-null assertion since we've already checked in beforeAll)
    if (!fs.existsSync(EXTRACTED_FILES_FOLDER_PATH)) {
      throw new Error(`Extracted files folder does not exist: ${EXTRACTED_FILES_FOLDER_PATH}`);
    }

    // Find the latest users file
    const { stdout, stderr } = await execPromise(
      `ls ${EXTRACTED_FILES_FOLDER_PATH} | grep extractor_users | sort -r | head -n 1`
    );
    
    if (stderr) {
      console.error('Error finding latest users file:', stderr);
    }

    const filename = stdout.trim();
    if (!filename) {
      throw new Error('No extracted users file found');
    }

    const filePath = path.join(EXTRACTED_FILES_FOLDER_PATH, filename); 
    if (!fs.existsSync(filePath)) {
      throw new Error(`Extracted users file not found at: ${filePath}`);
    }

    return filePath;
  } catch (error) {
    console.error('Error getting latest extracted users file:', error);
    throw error;
  }
}

/**
 * Validate extracted data using Chef CLI
 */
async function validateWithChefCli(metadataFilePath: string, recordType: string, extractedFilePath: string): Promise<void> {
  try {
    const fileContent = fs.readFileSync(extractedFilePath, 'utf8');

    // Construct the Chef CLI command
    const command = `cat "${extractedFilePath}" | "${CHEF_CLI_PATH}" validate-data -m "${metadataFilePath}" -r ${recordType}`;
    
    console.log(`Executing Chef CLI command: ${command}`);
    
    // Execute the Chef CLI command
    const { stdout, stderr } = await execPromise(command);
    
    // Always print stdout and stderr for debugging
    console.log('Chef CLI stdout:', stdout);
    if (stderr) {
      console.error('Chef CLI stderr:', stderr);
    }
    
    // If there's any output, the validation failed
    if (stdout.trim()) {
      throw new Error(`Chef CLI validation failed with output: ${stdout}`);
    }
  } catch (error: any) {
    console.error('Error validating with Chef CLI:', error);
    throw error;
  }
}

/**
 * Get external domain metadata
 */
async function getExternalDomainMetadata(): Promise<string> {
  try {
    // Load the external domain metadata event payload
    const eventPayloadPath = path.join(__dirname, 'test-data', 'external_domain_metadata_event_payload.json');
    if (!fs.existsSync(eventPayloadPath)) {
      throw new Error(`External domain metadata event payload file not found at: ${eventPayloadPath}`);
    }
    
    const eventPayloadRaw = fs.readFileSync(eventPayloadPath, 'utf8');
    const eventPayload = JSON.parse(eventPayloadRaw);
    
    // Replace placeholders with actual values
    if (eventPayload.payload?.connection_data?.key) {
      eventPayload.payload.connection_data.key = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
    }
    
    if (eventPayload.payload?.connection_data?.org_id) {
      eventPayload.payload.connection_data.org_id = TRELLO_ORGANIZATION_ID;
    }
    
    // Send the event to get external domain metadata
    const response = await sendEventToSnapIn({
      ...eventPayload,
      execution_metadata: { 
        ...eventPayload.execution_metadata,
        function_name: 'get_external_domain_metadata'
      }
    });
    
    if (!response.function_result?.success || !response.function_result?.metadata) {
      throw new Error(`Failed to get external domain metadata: ${JSON.stringify(response)}`);
    }
    
    // Save metadata to a temporary file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const metadataFilePath = path.join(tempDir, 'external_domain_metadata.json');
    fs.writeFileSync(metadataFilePath, JSON.stringify(response.function_result.metadata, null, 2));
    
    return metadataFilePath;
  } catch (error: any) {
    console.error('Error getting external domain metadata:', error);
    throw error;
  }
}

describe('Normalization Acceptance Test', () => {
  test('validates user data normalization with Chef CLI', async () => {
    // Set up the callback server
    const { server, receivedData } = await createCallbackServer();
    
    try {
      // Load the data extraction test event
      const testDataPath = path.join(__dirname, 'test-data', 'data_extraction_test.json');
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`Test data file not found at: ${testDataPath}`);
      }
      
      const testDataRaw = fs.readFileSync(testDataPath, 'utf8');
      let testData = JSON.parse(testDataRaw);
      
      // Make sure we have at least one event
      if (!testData || !Array.isArray(testData) || testData.length === 0) {
        throw new Error('Invalid test data: Expected non-empty array');
      }
      
      // Get the first event
      const event = testData[0];
      
      // Replace placeholders with actual values
      if (event.payload?.connection_data?.key) {
        event.payload.connection_data.key = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
      } else {
        throw new Error('Invalid test data: Missing connection_data.key in payload');
      }
      
      if (event.payload?.connection_data?.org_id) {
        event.payload.connection_data.org_id = TRELLO_ORGANIZATION_ID;
      } else {
        throw new Error('Invalid test data: Missing connection_data.org_id in payload');
      }
      
      // Update callback URL to point to our test server
      if (event.payload?.event_context?.callback_url) {
        event.payload.event_context.callback_url = CALLBACK_SERVER_URL + '/callback';
      } else {
        throw new Error('Invalid test data: Missing event_context.callback_url in payload');
      }
      
      // Send the event to the snap-in server to trigger extraction
      console.log('Sending extraction event to snap-in server...');
      const response = await sendEventToSnapIn(event);
      
      // Verify the response indicates success
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      // Wait for the callback to be received (up to 30 seconds)
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      
      // Poll for the EXTRACTION_DATA_DONE event
      let foundDoneEvent = false;
      while (Date.now() - startTime < maxWaitTime && !foundDoneEvent) {
        // Check if we've received the EXTRACTION_DATA_DONE event
        for (const data of receivedData) {
          if (data.event_type === 'EXTRACTION_DATA_DONE') {
            foundDoneEvent = true;
            break;
          }
        }
        
        if (!foundDoneEvent) {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!foundDoneEvent) {
        throw new Error('Timed out waiting for EXTRACTION_DATA_DONE event');
      }
      
      console.log('Extraction completed successfully');
      
      // Get the external domain metadata
      console.log('Getting external domain metadata...');
      const metadataFilePath = await getExternalDomainMetadata();
      
      // Get the latest extracted users file
      console.log('Getting latest extracted users file...');
      const extractedFilePath = await getLatestExtractedUsersFile();
      
      // Validate the extracted users data using Chef CLI
      console.log('Validating extracted users data with Chef CLI...');
      await validateWithChefCli(metadataFilePath, 'users', extractedFilePath);
      
      console.log('Validation completed successfully');
    } finally {
      // Clean up the server
      if (server) {
        server.close();
      }
      
      // Clean up temporary files
      const tempDir = path.join(__dirname, 'temp');
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (error) {
          console.error('Error cleaning up temporary files:', error);
        }
      }
    }
  }, 120000); // 120 second timeout for this test
});