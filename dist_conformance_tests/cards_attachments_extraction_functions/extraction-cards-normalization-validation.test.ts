import { TestUtils } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Function - Cards Normalization Validation with Chef CLI', () => {
  let env: any;

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  test('should validate cards normalization function using chef-cli tool', async () => {
    console.log('Starting cards normalization validation test...');
    
    // Step 1: Validate required environment variables
    console.log('Step 1: Validating environment variables...');
    
    if (!env.CHEF_CLI_PATH) {
      throw new Error('Missing required environment variable: CHEF_CLI_PATH. This should point to the chef-cli executable.');
    }
    
    if (!env.EXTRACTED_FILES_FOLDER_PATH) {
      throw new Error('Missing required environment variable: EXTRACTED_FILES_FOLDER_PATH. This should point to the folder where extracted files are stored.');
    }
    
    // Verify Chef CLI is available
    console.log(`Checking Chef CLI availability at: ${env.CHEF_CLI_PATH}`);
    const chefCliExists = await TestUtils.fileExists(env.CHEF_CLI_PATH);
    if (!chefCliExists) {
      throw new Error(`Chef CLI executable not found at path: ${env.CHEF_CLI_PATH}. Please ensure the chef-cli tool is installed and the path is correct.`);
    }
    
    console.log('✓ Environment variables validated successfully');
    
    // Step 2: Get External Domain Metadata
    console.log('Step 2: Retrieving External Domain Metadata...');
    
    const metadataPayloadPath = path.join(__dirname, 'external_domain_metadata_event_payload.json');
    if (!fs.existsSync(metadataPayloadPath)) {
      throw new Error(`External domain metadata event payload file not found at: ${metadataPayloadPath}`);
    }
    
    const rawMetadataPayload = fs.readFileSync(metadataPayloadPath, 'utf8');
    let metadataEvent;
    
    try {
      metadataEvent = JSON.parse(rawMetadataPayload);
    } catch (error) {
      throw new Error(`Failed to parse external domain metadata event payload JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Replace placeholders with actual environment values
    const connectionKey = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
    metadataEvent.payload.connection_data.key = connectionKey;
    metadataEvent.payload.connection_data.org_id = env.TRELLO_ORGANIZATION_ID;
    
    console.log('Sending get_external_domain_metadata event to snap-in...');
    const metadataResponse = await TestUtils.sendEventToSnapIn(metadataEvent);
    
    if (!metadataResponse || !metadataResponse.function_result || !metadataResponse.function_result.success) {
      throw new Error(`Failed to retrieve external domain metadata. Response: ${JSON.stringify(metadataResponse, null, 2)}`);
    }
    
    const externalDomainMetadata = metadataResponse.function_result.metadata;
    if (!externalDomainMetadata) {
      throw new Error(`External domain metadata is missing from response. Full response: ${JSON.stringify(metadataResponse, null, 2)}`);
    }
    
    console.log('✓ External Domain Metadata retrieved successfully');
    
    // Step 3: Create temporary metadata file
    console.log('Step 3: Creating temporary metadata file...');
    
    const tempMetadataFile = await TestUtils.createTempFile('external_domain_metadata', '.json', JSON.stringify(externalDomainMetadata, null, 2));
    console.log(`✓ Temporary metadata file created at: ${tempMetadataFile}`);
    
    try {
      // Step 4: Invoke extraction function
      console.log('Step 4: Invoking extraction function...');
      
      const extractionPayloadPath = path.join(__dirname, 'data_extraction_test_payload.json');
      if (!fs.existsSync(extractionPayloadPath)) {
        throw new Error(`Extraction test payload file not found at: ${extractionPayloadPath}`);
      }
      
      const rawExtractionPayload = fs.readFileSync(extractionPayloadPath, 'utf8');
      let extractionEvent;
      
      try {
        extractionEvent = JSON.parse(rawExtractionPayload);
      } catch (error) {
        throw new Error(`Failed to parse extraction test payload JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Replace placeholders with actual environment values
      extractionEvent.payload.connection_data.key = connectionKey;
      extractionEvent.payload.connection_data.org_id = env.TRELLO_ORGANIZATION_ID;
      
      console.log('Sending extraction event to snap-in...');
      const extractionResponse = await TestUtils.sendEventToSnapIn(extractionEvent);
      
      if (!extractionResponse || !extractionResponse.function_result || !extractionResponse.function_result.success) {
        throw new Error(`Failed to invoke extraction function. Response: ${JSON.stringify(extractionResponse, null, 2)}`);
      }
      
      console.log('✓ Extraction function invoked successfully');
      console.log('Waiting for extraction to complete...');
      
      // Step 5: Wait for extraction to complete
      const maxWaitTime = 60000; // 60 seconds
      const pollInterval = 1000; // 1 second
      let waitTime = 0;
      let extractionCompleted = false;
      
      while (waitTime < maxWaitTime && !extractionCompleted) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waitTime += pollInterval;
        
        const callbackData = TestUtils.getCallbackData();
        
        if (callbackData.length > 0) {
          const finalEvent = callbackData[callbackData.length - 1];
          if (finalEvent.event_type === 'EXTRACTION_DATA_DONE') {
            extractionCompleted = true;
            console.log('✓ Extraction completed successfully');
          } else if (finalEvent.event_type === 'EXTRACTION_DATA_ERROR') {
            throw new Error(`Extraction failed with error: ${JSON.stringify(finalEvent.error || finalEvent, null, 2)}`);
          }
        }
      }
      
      if (!extractionCompleted) {
        throw new Error(`Extraction did not complete within ${maxWaitTime}ms. This is required before validating the normalization function.`);
      }
      
      // Step 6: Verify extracted files folder exists
      console.log('Step 6: Verifying extracted files folder...');
      
      const extractedFilesFolderExists = await TestUtils.directoryExists(env.EXTRACTED_FILES_FOLDER_PATH);
      if (!extractedFilesFolderExists) {
        throw new Error(`Extracted files folder does not exist at path: ${env.EXTRACTED_FILES_FOLDER_PATH}. This folder should be created after extraction function execution. Please verify that the extraction function is working correctly and that the EXTRACTED_FILES_FOLDER_PATH environment variable is set correctly.`);
      }
      
      console.log('✓ Extracted files folder exists');
      
      // Step 7: Find the cards extracted file
      console.log('Step 7: Locating cards extracted file...');
      
      const findCardFileCommand = `ls ${env.EXTRACTED_FILES_FOLDER_PATH} | grep extractor_cards | sort -r | head -n 1`;
      console.log(`Executing command: ${findCardFileCommand}`);
      
      const cardFileResult = await TestUtils.executeCommand(findCardFileCommand);
      if (cardFileResult.exitCode !== 0) {
        throw new Error(`Failed to list files in extracted files folder. Command: ${findCardFileCommand}\nExit code: ${cardFileResult.exitCode}\nStdout: ${cardFileResult.stdout}\nStderr: ${cardFileResult.stderr}`);
      }
      
      const cardFileName = cardFileResult.stdout.trim();
      if (!cardFileName) {
        const listAllFilesCommand = `ls -la ${env.EXTRACTED_FILES_FOLDER_PATH}`;
        const allFilesResult = await TestUtils.executeCommand(listAllFilesCommand);
        throw new Error(`No cards extracted file found. Expected to find a file matching pattern 'extractor_cards' in folder: ${env.EXTRACTED_FILES_FOLDER_PATH}\n\nAll files in folder:\n${allFilesResult.stdout}\n\nThis indicates that the extraction function did not properly extract cards data. Please verify that the extraction function is working correctly.`);
      }
      
      const cardFilePath = path.join(env.EXTRACTED_FILES_FOLDER_PATH, cardFileName);
      console.log(`Found cards extracted file: ${cardFileName}`);
      
      // Verify the file exists
      const cardFileExists = await TestUtils.fileExists(cardFilePath);
      if (!cardFileExists) {
        throw new Error(`Cards extracted file does not exist at path: ${cardFilePath}. This should not happen if the file was found by the ls command.`);
      }
      
      console.log('✓ Cards extracted file located successfully');
      
      // Step 8: Validate normalization using Chef CLI
      console.log('Step 8: Validating cards normalization using Chef CLI...');
      
      const chefCliCommand = `${env.CHEF_CLI_PATH} validate-data -m ${tempMetadataFile} -r cards`;
      console.log(`Executing Chef CLI command: ${chefCliCommand}`);
      console.log(`Input file: ${cardFilePath}`);
      
      const chefCliResult = await TestUtils.executeCommandWithStdin(chefCliCommand, cardFilePath);
      
      // Always print Chef CLI output for debugging
      console.log('=== Chef CLI Output ===');
      console.log('STDOUT:');
      console.log(chefCliResult.stdout || '(empty)');
      console.log('STDERR:');
      console.log(chefCliResult.stderr || '(empty)');
      console.log('Exit Code:', chefCliResult.exitCode);
      console.log('=====================');
      
      // Check if Chef CLI execution was successful
      if (chefCliResult.exitCode !== 0) {
        throw new Error(`Chef CLI validation failed with exit code ${chefCliResult.exitCode}.\n\nCommand: ${chefCliCommand}\nInput file: ${cardFilePath}\n\nSTDOUT:\n${chefCliResult.stdout}\n\nSTDERR:\n${chefCliResult.stderr}\n\nThis indicates that the cards normalization function does not produce data that conforms to the external domain metadata specification.`);
      }
      
      // For successful validation, Chef CLI must return empty output
      const hasOutput = (chefCliResult.stdout && chefCliResult.stdout.trim()) || (chefCliResult.stderr && chefCliResult.stderr.trim());
      if (hasOutput) {
        throw new Error(`Chef CLI validation failed: expected empty output for successful validation, but received output.\n\nCommand: ${chefCliCommand}\nInput file: ${cardFilePath}\n\nSTDOUT:\n${chefCliResult.stdout}\n\nSTDERR:\n${chefCliResult.stderr}\n\nThis indicates that the cards normalization function produces data that does not fully conform to the external domain metadata specification. Please review the normalization function implementation.`);
      }
      
      console.log('✓ Chef CLI validation passed: normalization function produces valid data');
      console.log('✓ All cards normalization validation criteria satisfied');
      
    } finally {
      // Clean up temporary metadata file
      try {
        await TestUtils.deleteFile(tempMetadataFile);
        console.log('✓ Temporary metadata file cleaned up');
      } catch (cleanupError) {
        console.warn(`Warning: Failed to clean up temporary metadata file: ${tempMetadataFile}. Error: ${cleanupError}`);
      }
    }
    
  }, 90000); // 90 second timeout to allow for extraction and validation
});