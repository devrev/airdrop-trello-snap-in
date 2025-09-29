import { getTestEnvironment, setupCallbackServer, closeServer, sendEventToSnapIn, TestServers } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Extraction Function - Cards Normalization Validation', () => {
  let testServers: TestServers;
  let callbackEvents: any[] = [];
  const env = getTestEnvironment();

  beforeAll(async () => {
    // Validate required environment variables
    validateEnvironmentVariables();
    
    // Set up callback server with event capture
    testServers = await setupCallbackServerWithCapture();
  });

  afterAll(async () => {
    if (testServers?.callbackServer) {
      await closeServer(testServers.callbackServer);
    }
  });

  beforeEach(() => {
    // Clear captured events before each test
    callbackEvents = [];
  });

  function validateEnvironmentVariables(): void {
    const requiredVars = ['CHEF_CLI_PATH', 'EXTRACTED_FILES_FOLDER_PATH'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
        `Please ensure these variables are set before running the normalization validation test.`
      );
    }

    // Validate Chef CLI availability
    const chefCliPath = process.env.CHEF_CLI_PATH!;
    if (!fs.existsSync(chefCliPath)) {
      throw new Error(
        `Chef CLI executable not found at path: ${chefCliPath}. ` +
        `Please verify the CHEF_CLI_PATH environment variable points to a valid executable.`
      );
    }

    // Test Chef CLI execution
    try {
      execSync(`"${chefCliPath}" --help`, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(
        `Chef CLI is not executable or not working properly at path: ${chefCliPath}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async function setupCallbackServerWithCapture(): Promise<TestServers> {
    return new Promise((resolve, reject) => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Callback endpoint that captures events
      app.post('/callback', (req: any, res: any) => {
        console.log('Received callback event:', JSON.stringify(req.body, null, 2));
        callbackEvents.push(req.body);
        res.status(200).json({ received: true });
      });

      const server = app.listen(8002, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            callbackServer: server,
            callbackUrl: 'http://localhost:8002/callback',
          });
        }
      });
    });
  }

  function loadAndPrepareExtractionEvent(): any {
    try {
      // Load the extraction test event from JSON file
      const testEventPath = path.join(__dirname, 'data_extraction_test.json');
      const testEventData = fs.readFileSync(testEventPath, 'utf8');
      const testEvents = JSON.parse(testEventData);
      
      if (!Array.isArray(testEvents) || testEvents.length === 0) {
        throw new Error('Invalid extraction test event data: expected non-empty array');
      }

      const event = testEvents[0];

      // Replace credential placeholders with actual values
      if (event.payload?.connection_data?.key) {
        event.payload.connection_data.key = event.payload.connection_data.key
          .replace('<TRELLO_API_KEY>', env.TRELLO_API_KEY)
          .replace('<TRELLO_TOKEN>', env.TRELLO_TOKEN);
      }

      if (event.payload?.connection_data?.org_id) {
        event.payload.connection_data.org_id = event.payload.connection_data.org_id
          .replace('<TRELLO_ORGANIZATION_ID>', env.TRELLO_ORGANIZATION_ID);
      }

      // Update callback URL to point to our test server
      if (event.payload?.event_context?.callback_url) {
        event.payload.event_context.callback_url = testServers.callbackUrl;
      }

      return event;
    } catch (error) {
      throw new Error(`Failed to load or prepare extraction test event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function loadAndPrepareMetadataEvent(): any {
    try {
      // Load the metadata event from JSON file
      const metadataEventPath = path.join(__dirname, 'external_domain_metadata_event_payload.json');
      const metadataEventData = fs.readFileSync(metadataEventPath, 'utf8');
      const metadataEvents = JSON.parse(metadataEventData);
      
      if (!Array.isArray(metadataEvents) || metadataEvents.length === 0) {
        throw new Error('Invalid metadata event data: expected non-empty array');
      }

      const event = metadataEvents[0];

      // Replace credential placeholders with actual values
      if (event.payload?.connection_data?.key) {
        event.payload.connection_data.key = event.payload.connection_data.key
          .replace('<TRELLO_API_KEY>', env.TRELLO_API_KEY)
          .replace('<TRELLO_TOKEN>', env.TRELLO_TOKEN);
      }

      if (event.payload?.connection_data?.org_id) {
        event.payload.connection_data.org_id = event.payload.connection_data.org_id
          .replace('<TRELLO_ORGANIZATION_ID>', env.TRELLO_ORGANIZATION_ID);
      }

      return event;
    } catch (error) {
      throw new Error(`Failed to load or prepare metadata event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function waitForCallbackEvent(eventType: string, timeoutMs: number = 60000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForEvent = () => {
        // Look for the specific event type in captured events
        const targetEvent = callbackEvents.find(event => 
          event.event_type === eventType || 
          event.payload?.event_type === eventType ||
          event.type === eventType
        );

        if (targetEvent) {
          resolve(targetEvent);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          const receivedEventTypes = callbackEvents.map(event => 
            event.event_type || event.payload?.event_type || event.type || 'unknown'
          );
          reject(new Error(
            `Timeout waiting for callback event '${eventType}' after ${timeoutMs}ms. ` +
            `This indicates that the extraction function did not complete properly. ` +
            `Received ${callbackEvents.length} events with types: [${receivedEventTypes.join(', ')}]. ` +
            `Full events: ${JSON.stringify(callbackEvents, null, 2)}`
          ));
          return;
        }

        // Continue checking
        setTimeout(checkForEvent, 1000);
      };

      checkForEvent();
    });
  }

  async function fetchExternalDomainMetadata(): Promise<any> {
    console.log('=== Fetching External Domain Metadata ===');
    
    const metadataEvent = loadAndPrepareMetadataEvent();
    
    console.log('Sending get_external_domain_metadata event to snap-in server...');
    
    const response = await sendEventToSnapIn(metadataEvent);
    
    console.log('Metadata response:', JSON.stringify(response, null, 2));

    if (response.error) {
      throw new Error(
        `Failed to fetch external domain metadata: ${JSON.stringify(response.error)}. ` +
        `The get_external_domain_metadata function must be working properly for normalization validation.`
      );
    }

    if (!response.function_result?.external_domain_metadata) {
      throw new Error(
        `External domain metadata not found in response. Response structure: ${JSON.stringify(response, null, 2)}. ` +
        `Expected response.function_result.external_domain_metadata to contain the metadata object.`
      );
    }

    return response.function_result.external_domain_metadata;
  }

  function saveMetadataToTempFile(metadata: any): string {
    try {
      const tempDir = path.join(__dirname, 'temp');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `external-domain-metadata-${Date.now()}.json`);
      
      fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2), 'utf8');
      
      console.log(`Saved external domain metadata to temporary file: ${tempFilePath}`);
      
      return tempFilePath;
    } catch (error) {
      throw new Error(
        `Failed to save metadata to temporary file: ${error instanceof Error ? error.message : String(error)}. ` +
        `This is required for Chef CLI validation.`
      );
    }
  }

  function findExtractedCardsFile(): string {
    const extractedFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH!;
    
    console.log(`=== Locating Extracted Cards File ===`);
    console.log(`Searching in folder: ${extractedFolderPath}`);

    // Check if the extracted files folder exists
    if (!fs.existsSync(extractedFolderPath)) {
      throw new Error(
        `Extracted files folder does not exist: ${extractedFolderPath}. ` +
        `This folder should be created after the extraction function completes. ` +
        `Please verify that the extraction function ran successfully and created the expected output files.`
      );
    }

    // List all files in the folder for debugging
    let allFiles: string[];
    try {
      allFiles = fs.readdirSync(extractedFolderPath);
      console.log(`All files in extracted folder: [${allFiles.join(', ')}]`);
    } catch (error) {
      throw new Error(
        `Failed to read extracted files folder: ${extractedFolderPath}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Find the cards extractor file using the specified command pattern
    let cardsFileName: string;
    try {
      const command = `ls "${extractedFolderPath}" | grep extractor_cards | sort -r | head -n 1`;
      console.log(`Executing command to find cards file: ${command}`);
      
      const result = execSync(command, { encoding: 'utf8' }).trim();
      
      if (!result) {
        throw new Error(
          `No cards extractor file found in ${extractedFolderPath}. ` +
          `Expected to find a file matching pattern 'extractor_cards*'. ` +
          `Available files: [${allFiles.join(', ')}]. ` +
          `This indicates that the extraction function did not create the expected cards output file.`
        );
      }
      
      cardsFileName = result;
      console.log(`Found cards file: ${cardsFileName}`);
    } catch (error) {
      throw new Error(
        `Failed to locate cards extractor file: ${error instanceof Error ? error.message : String(error)}. ` +
        `Command used: ls "${extractedFolderPath}" | grep extractor_cards | sort -r | head -n 1. ` +
        `Available files: [${allFiles.join(', ')}]`
      );
    }

    const cardsFilePath = path.join(extractedFolderPath, cardsFileName);
    
    // Verify the file exists and is readable
    if (!fs.existsSync(cardsFilePath)) {
      throw new Error(
        `Cards extractor file does not exist: ${cardsFilePath}. ` +
        `This should not happen if the file was found by the grep command.`
      );
    }

    try {
      fs.accessSync(cardsFilePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(
        `Cards extractor file is not readable: ${cardsFilePath}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    console.log(`Successfully located cards extractor file: ${cardsFilePath}`);
    return cardsFilePath;
  }

  function validateCardsNormalizationWithChefCli(metadataFilePath: string, cardsFilePath: string): void {
    const chefCliPath = process.env.CHEF_CLI_PATH!;
    
    console.log(`=== Validating Cards Normalization with Chef CLI ===`);
    console.log(`Chef CLI path: ${chefCliPath}`);
    console.log(`Metadata file: ${metadataFilePath}`);
    console.log(`Cards file: ${cardsFilePath}`);

    try {
      // Construct the Chef CLI command
      const command = `"${chefCliPath}" validate-data -m "${metadataFilePath}" -r cards`;
      console.log(`Executing Chef CLI command: ${command}`);
      
      // Read the cards file content to pipe to stdin
      const cardsFileContent = fs.readFileSync(cardsFilePath, 'utf8');
      console.log(`Cards file size: ${cardsFileContent.length} characters`);
      
      // Execute Chef CLI with cards file content as stdin
      const result = execSync(command, {
        input: cardsFileContent,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Log the Chef CLI output
      console.log('=== Chef CLI stdout ===');
      console.log(result || '(empty)');
      
      // For successful validation, Chef CLI should return empty output
      if (result.trim() !== '') {
        throw new Error(
          `Chef CLI validation failed. Expected empty output for successful validation, but got: "${result.trim()}". ` +
          `This indicates that the cards normalization function does not properly transform the data according to the external domain metadata. ` +
          `Please check the normalization logic in the extraction function.`
        );
      }

      console.log('✓ Chef CLI validation successful - empty output indicates proper normalization');

    } catch (error: any) {
      // Handle execution errors
      if (error.status !== undefined) {
        // This is an execSync error with status code
        const stdout = error.stdout?.toString() || '';
        const stderr = error.stderr?.toString() || '';
        
        console.log('=== Chef CLI stdout ===');
        console.log(stdout || '(empty)');
        console.log('=== Chef CLI stderr ===');
        console.log(stderr || '(empty)');
        
        throw new Error(
          `Chef CLI validation failed with exit code ${error.status}. ` +
          `This indicates that the cards normalization function produces invalid data. ` +
          `stdout: "${stdout.trim()}" ` +
          `stderr: "${stderr.trim()}" ` +
          `Please review the normalization logic and ensure it matches the external domain metadata schema.`
        );
      } else {
        // Other types of errors (file system, etc.)
        throw new Error(
          `Failed to execute Chef CLI validation: ${error.message}. ` +
          `Please verify that the Chef CLI is properly installed and accessible at: ${chefCliPath}`
        );
      }
    }
  }

  function cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup temporary file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  test('should validate cards normalization function using Chef CLI', async () => {
    let tempMetadataFile: string | null = null;

    try {
      // Step 1: Execute extraction function
      console.log('=== Step 1: Executing Extraction Function ===');
      
      const extractionEvent = loadAndPrepareExtractionEvent();
      
      console.log('Sending EXTRACTION_DATA_START event to snap-in server...');
      
      const extractionResponse = await sendEventToSnapIn(extractionEvent);
      
      console.log('Extraction response:', JSON.stringify(extractionResponse, null, 2));

      if (extractionResponse.error) {
        throw new Error(
          `Extraction function failed: ${JSON.stringify(extractionResponse.error)}. ` +
          `The extraction function must complete successfully before normalization validation can be performed.`
        );
      }

      // Wait for extraction completion
      console.log('Waiting for EXTRACTION_DATA_DONE callback event...');
      
      const callbackEvent = await waitForCallbackEvent('EXTRACTION_DATA_DONE', 90000);
      
      console.log('Received EXTRACTION_DATA_DONE event:', JSON.stringify(callbackEvent, null, 2));

      // Step 2: Fetch external domain metadata
      console.log('=== Step 2: Fetching External Domain Metadata ===');
      
      const metadata = await fetchExternalDomainMetadata();
      
      // Step 3: Save metadata to temporary file
      console.log('=== Step 3: Saving Metadata to Temporary File ===');
      
      tempMetadataFile = saveMetadataToTempFile(metadata);

      // Step 4: Locate extracted cards file
      console.log('=== Step 4: Locating Extracted Cards File ===');
      
      const cardsFilePath = findExtractedCardsFile();

      // Step 5: Validate normalization with Chef CLI
      console.log('=== Step 5: Validating Normalization with Chef CLI ===');
      
      validateCardsNormalizationWithChefCli(tempMetadataFile, cardsFilePath);

      console.log('✓ Cards normalization validation completed successfully');

    } catch (error) {
      console.error('Cards normalization validation failed:', error);
      throw error;
    } finally {
      // Cleanup temporary files
      if (tempMetadataFile) {
        cleanupTempFile(tempMetadataFile);
      }
    }
  }, 120000);
});