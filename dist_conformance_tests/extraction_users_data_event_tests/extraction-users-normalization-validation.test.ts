import { 
  getTestEnvironment, 
  setupCallbackServer, 
  closeCallbackServer, 
  sendEventToSnapIn,
  CallbackServerSetup,
  TestEnvironment 
} from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

describe('Extraction Function - Users Normalization Validation', () => {
  let env: TestEnvironment;
  let callbackServer: CallbackServerSetup;
  let tempMetadataFile: string | null = null;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await closeCallbackServer(callbackServer);
    }
    
    // Clean up temporary metadata file
    if (tempMetadataFile && fs.existsSync(tempMetadataFile)) {
      try {
        fs.unlinkSync(tempMetadataFile);
      } catch (error) {
        console.warn(`Failed to clean up temporary metadata file ${tempMetadataFile}:`, error);
      }
    }
  });

  beforeEach(() => {
    // Clear received callbacks before each test
    callbackServer.receivedCallbacks.length = 0;
  });

  function getRequiredEnvironmentVariables(): { CHEF_CLI_PATH: string; EXTRACTED_FILES_FOLDER_PATH: string } {
    const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH;
    const EXTRACTED_FILES_FOLDER_PATH = process.env.EXTRACTED_FILES_FOLDER_PATH;

    if (!CHEF_CLI_PATH) {
      throw new Error(
        'CHEF_CLI_PATH environment variable is required for normalization validation tests. ' +
        'This should point to the chef-cli executable.'
      );
    }

    if (!EXTRACTED_FILES_FOLDER_PATH) {
      throw new Error(
        'EXTRACTED_FILES_FOLDER_PATH environment variable is required for normalization validation tests. ' +
        'This should point to the folder containing extracted files.'
      );
    }

    return { CHEF_CLI_PATH, EXTRACTED_FILES_FOLDER_PATH };
  }

  function loadAndPrepareExtractionEvent(): any {
    try {
      const testDataPath = path.join(__dirname, 'data_extraction_test.json');
      
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`Extraction test data file not found at: ${testDataPath}`);
      }

      const testDataContent = fs.readFileSync(testDataPath, 'utf8');
      const testEvents = JSON.parse(testDataContent);
      
      if (!Array.isArray(testEvents) || testEvents.length === 0) {
        throw new Error('Extraction test data file should contain an array with at least one event');
      }

      const event = testEvents[0];
      
      // Replace credential placeholders with actual values
      const eventStr = JSON.stringify(event)
        .replace(/<TRELLO_API_KEY>/g, env.TRELLO_API_KEY)
        .replace(/<TRELLO_TOKEN>/g, env.TRELLO_TOKEN)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.TRELLO_ORGANIZATION_ID);
      
      return JSON.parse(eventStr);
    } catch (error) {
      throw new Error(`Failed to load and prepare extraction test event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function loadAndPrepareMetadataEvent(): any {
    try {
      const testDataPath = path.join(__dirname, 'external_domain_metadata_event_payload.json');
      
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`External domain metadata test data file not found at: ${testDataPath}`);
      }

      const testDataContent = fs.readFileSync(testDataPath, 'utf8');
      const testEvents = JSON.parse(testDataContent);
      
      if (!Array.isArray(testEvents) || testEvents.length === 0) {
        throw new Error('External domain metadata test data file should contain an array with at least one event');
      }

      const event = testEvents[0];
      
      // Replace credential placeholders with actual values
      const eventStr = JSON.stringify(event)
        .replace(/<TRELLO_API_KEY>/g, env.TRELLO_API_KEY)
        .replace(/<TRELLO_TOKEN>/g, env.TRELLO_TOKEN)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.TRELLO_ORGANIZATION_ID);
      
      return JSON.parse(eventStr);
    } catch (error) {
      throw new Error(`Failed to load and prepare metadata test event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function waitForExtractionCallback(timeoutMs: number = 90000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForCallback = () => {
        const elapsedTime = Date.now() - startTime;
        
        // Look for EXTRACTION_DATA_DONE callback
        const doneCallback = callbackServer.receivedCallbacks.find(
          callback => callback.body && callback.body.event_type === 'EXTRACTION_DATA_DONE'
        );
        
        if (doneCallback) {
          resolve(doneCallback);
          return;
        }
        
        if (elapsedTime >= timeoutMs) {
          const receivedEventTypes = callbackServer.receivedCallbacks.map(
            callback => callback.body?.event_type || 'unknown'
          );
          reject(new Error(
            `Timeout waiting for EXTRACTION_DATA_DONE callback after ${timeoutMs}ms. ` +
            `Received ${callbackServer.receivedCallbacks.length} callbacks with event_types: [${receivedEventTypes.join(', ')}]. ` +
            `Expected EXTRACTION_DATA_DONE callback to proceed with normalization validation.`
          ));
          return;
        }
        
        setTimeout(checkForCallback, 2000);
      };
      
      checkForCallback();
    });
  }

  async function getExternalDomainMetadata(): Promise<any> {
    const metadataEvent = loadAndPrepareMetadataEvent();
    
    console.log('Invoking get_external_domain_metadata function...');
    const response = await sendEventToSnapIn(metadataEvent);
    
    if (response.status !== 200) {
      throw new Error(
        `Failed to invoke get_external_domain_metadata function. ` +
        `Server responded with status ${response.status}: ${JSON.stringify(response.data)}`
      );
    }
    
    if (response.data.error) {
      throw new Error(
        `get_external_domain_metadata function returned error: ${JSON.stringify(response.data.error, null, 2)}`
      );
    }
    
    if (!response.data.function_result || !response.data.function_result.external_domain_metadata) {
      throw new Error(
        `get_external_domain_metadata function did not return expected metadata. ` +
        `Response: ${JSON.stringify(response.data, null, 2)}`
      );
    }
    
    return response.data.function_result.external_domain_metadata;
  }

  function createTemporaryMetadataFile(metadata: any): string {
    try {
      const tempDir = os.tmpdir();
      const tempFileName = `external_domain_metadata_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2), 'utf8');
      
      console.log(`Created temporary metadata file: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      throw new Error(`Failed to create temporary metadata file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function findExtractedUsersFile(extractedFilesFolderPath: string): string {
    try {
      // Check if the extracted files folder exists
      if (!fs.existsSync(extractedFilesFolderPath)) {
        throw new Error(
          `Extracted files folder does not exist: ${extractedFilesFolderPath}. ` +
          `This folder should be created after the extraction function completes. ` +
          `Make sure the extraction function was executed successfully and the EXTRACTED_FILES_FOLDER_PATH environment variable is correct.`
        );
      }
      
      // List files in the folder and find the users file
      const files = fs.readdirSync(extractedFilesFolderPath);
      const usersFiles = files.filter(file => file.includes('extractor_users'));
      
      if (usersFiles.length === 0) {
        throw new Error(
          `No extracted users file found in folder: ${extractedFilesFolderPath}. ` +
          `Expected to find a file containing 'extractor_users' in the filename. ` +
          `Available files: [${files.join(', ')}]. ` +
          `This indicates that the extraction function did not successfully extract users data.`
        );
      }
      
      // Sort by name (reverse) and take the first one (most recent)
      usersFiles.sort().reverse();
      const selectedFile = usersFiles[0];
      const fullPath = path.join(extractedFilesFolderPath, selectedFile);
      
      console.log(`Found extracted users file: ${fullPath}`);
      console.log(`Available users files: [${usersFiles.join(', ')}]`);
      
      return fullPath;
    } catch (error) {
      throw new Error(`Failed to find extracted users file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function validateChefCliAvailability(chefCliPath: string): void {
    try {
      // Check if chef-cli executable exists
      if (!fs.existsSync(chefCliPath)) {
        throw new Error(
          `Chef CLI executable not found at path: ${chefCliPath}. ` +
          `Make sure the CHEF_CLI_PATH environment variable points to a valid chef-cli executable.`
        );
      }
      
      // Try to execute chef-cli to verify it's working
      const result = execSync(`"${chefCliPath}" --help`, { 
        encoding: 'utf8',
        timeout: 10000,
        stdio: 'pipe'
      });
      
      console.log('Chef CLI is available and working');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(
          `Chef CLI executable not found or not executable: ${chefCliPath}. ` +
          `Make sure the file exists and has execute permissions.`
        );
      } else if (error.status !== undefined && error.status !== 0) {
        throw new Error(
          `Chef CLI executable failed to run: ${chefCliPath}. ` +
          `Exit code: ${error.status}. ` +
          `Stderr: ${error.stderr || 'none'}. ` +
          `Stdout: ${error.stdout || 'none'}.`
        );
      } else {
        throw new Error(
          `Failed to validate Chef CLI availability: ${error.message}. ` +
          `Chef CLI path: ${chefCliPath}`
        );
      }
    }
  }

  function executeChefCliValidation(chefCliPath: string, metadataFilePath: string, extractedFilePath: string): void {
    try {
      const command = `"${chefCliPath}" validate-data -m "${metadataFilePath}" -r users`;
      
      console.log(`Executing chef-cli validation...`);
      console.log(`Chef CLI path: ${chefCliPath}`);
      console.log(`Metadata file: ${metadataFilePath}`);
      console.log(`Extracted file: ${extractedFilePath}`);
      
      // Read the extracted file content
      const extractedFileContent = fs.readFileSync(extractedFilePath, 'utf8');
      
      // Execute chef-cli validate-data command with extracted file content as stdin
      console.log(`Executing command: ${command}`);
      console.log(`Piping extracted file content to stdin...`);
      
      const result = execSync(command, {
        input: extractedFileContent,
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      
      // Print stdout and stderr for debugging
      console.log('=== Chef CLI Stdout ===');
      console.log(result || '(empty)');
      console.log('=== Chef CLI Stderr ===');
      console.log('(no stderr - command succeeded)');
      
      // For successful validation, chef-cli should return empty output
      if (result && result.trim() !== '') {
        throw new Error(
          `Chef CLI validation failed. Expected empty output for successful validation, but got: "${result.trim()}". ` +
          `This indicates that the normalization function for users data does not conform to the external domain metadata specification. ` +
          `Please check the normalization function implementation and ensure it produces data that matches the expected schema.`
        );
      }
      
      console.log('✅ Chef CLI validation successful: Empty output indicates valid normalization');
      
    } catch (error: any) {
      // Print stderr for debugging even when command fails
      console.log('=== Chef CLI Stdout ===');
      console.log(error.stdout || '(empty)');
      console.log('=== Chef CLI Stderr ===');
      console.log(error.stderr || '(empty)');
      
      if (error.status !== undefined && error.status !== 0) {
        throw new Error(
          `Chef CLI validation command failed with exit code ${error.status}. ` +
          `Stdout: "${error.stdout || '(empty)'}". ` +
          `Stderr: "${error.stderr || '(empty)'}". ` +
          `This indicates that the normalization function for users data does not conform to the external domain metadata specification.`
        );
      } else {
        throw new Error(
          `Failed to execute Chef CLI validation: ${error.message}. ` +
          `Make sure the chef-cli executable is working correctly and the metadata file is valid.`
        );
      }
    }
  }

  test('should validate users normalization function using chef-cli', async () => {
    console.log('Starting users normalization validation test...');
    
    // Step 1: Get required environment variables
    console.log('Step 1: Checking required environment variables...');
    const { CHEF_CLI_PATH, EXTRACTED_FILES_FOLDER_PATH } = getRequiredEnvironmentVariables();
    
    // Step 2: Validate chef-cli availability
    console.log('Step 2: Validating chef-cli availability...');
    validateChefCliAvailability(CHEF_CLI_PATH);
    
    // Step 3: Invoke extraction function
    console.log('Step 3: Invoking extraction function...');
    const extractionEvent = loadAndPrepareExtractionEvent();
    
    if (extractionEvent.payload.event_type !== 'EXTRACTION_DATA_START') {
      throw new Error(
        `Extraction test event has incorrect event_type. Expected "EXTRACTION_DATA_START", ` +
        `got "${extractionEvent.payload.event_type}".`
      );
    }
    
    const extractionResponse = await sendEventToSnapIn(extractionEvent);
    
    if (extractionResponse.status !== 200) {
      throw new Error(
        `Failed to invoke extraction function. Server responded with status ${extractionResponse.status}: ` +
        `${JSON.stringify(extractionResponse.data)}`
      );
    }
    
    if (extractionResponse.data.error) {
      throw new Error(
        `Extraction function returned error: ${JSON.stringify(extractionResponse.data.error, null, 2)}`
      );
    }
    
    expect(extractionResponse.data.function_result.success).toBe(true);
    console.log('Extraction function invoked successfully');
    
    // Step 4: Wait for extraction completion
    console.log('Step 4: Waiting for extraction completion...');
    const callback = await waitForExtractionCallback();
    
    expect(callback.body.event_type).toBe('EXTRACTION_DATA_DONE');
    console.log('Extraction completed successfully');
    
    // Step 5: Get external domain metadata
    console.log('Step 5: Getting external domain metadata...');
    const metadata = await getExternalDomainMetadata();
    
    // Step 6: Create temporary metadata file
    console.log('Step 6: Creating temporary metadata file...');
    tempMetadataFile = createTemporaryMetadataFile(metadata);
    
    // Step 7: Find extracted users file
    console.log('Step 7: Finding extracted users file...');
    const extractedUsersFile = findExtractedUsersFile(EXTRACTED_FILES_FOLDER_PATH);
    
    // Step 8: Execute chef-cli validation
    console.log('Step 8: Executing chef-cli validation...');
    executeChefCliValidation(CHEF_CLI_PATH, tempMetadataFile, extractedUsersFile);
    
    console.log('✅ All steps completed successfully: Users normalization function validation passed');
  }, 120000);
});