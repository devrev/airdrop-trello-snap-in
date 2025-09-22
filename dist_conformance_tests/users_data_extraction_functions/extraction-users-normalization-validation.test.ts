import { CallbackServer, getTestEnvironment, sendEventToSnapIn } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Extraction Function - Users Normalization Validation', () => {
  let callbackServer: CallbackServer;
  let testEnv: ReturnType<typeof getTestEnvironment>;
  let tempMetadataFile: string | null = null;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
    
    // Clean up temporary metadata file
    if (tempMetadataFile && fs.existsSync(tempMetadataFile)) {
      try {
        fs.unlinkSync(tempMetadataFile);
      } catch (error) {
        console.warn(`Failed to clean up temporary metadata file: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  beforeEach(() => {
    callbackServer.clearCallbacks();
  });

  test('should validate users normalization function using Chef CLI', async () => {
    // Step 1: Verify required environment variables
    const chefCliPath = process.env.CHEF_CLI_PATH;
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;

    if (!chefCliPath) {
      throw new Error(
        'CHEF_CLI_PATH environment variable is not set. ' +
        'This variable must point to the Chef CLI executable path for normalization validation.'
      );
    }

    if (!extractedFilesFolderPath) {
      throw new Error(
        'EXTRACTED_FILES_FOLDER_PATH environment variable is not set. ' +
        'This variable must point to the folder where extracted files are stored.'
      );
    }

    // Verify Chef CLI is available
    try {
      execSync(`"${chefCliPath}" --version`, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(
        `Chef CLI is not available at path: ${chefCliPath}. ` +
        `Please ensure the Chef CLI is installed and the CHEF_CLI_PATH environment variable points to the correct executable. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    console.log('Step 1: Environment validation completed successfully');

    // Step 2: Get External Domain Metadata
    console.log('Step 2: Retrieving External Domain Metadata...');
    
    const metadataPayloadPath = path.join(__dirname, 'external_domain_metadata_event_payload.json');
    
    if (!fs.existsSync(metadataPayloadPath)) {
      throw new Error(
        `External domain metadata event payload file not found at: ${metadataPayloadPath}. ` +
        'This file is required to retrieve the external domain metadata for validation.'
      );
    }

    let metadataPayload;
    try {
      const metadataPayloadContent = fs.readFileSync(metadataPayloadPath, 'utf8');
      metadataPayload = JSON.parse(metadataPayloadContent);
    } catch (error) {
      throw new Error(
        `Failed to parse external domain metadata event payload JSON: ${error instanceof Error ? error.message : String(error)}. ` +
        `File path: ${metadataPayloadPath}`
      );
    }

    // Replace placeholders in metadata payload
    const metadataPayloadString = JSON.stringify(metadataPayload)
      .replace(/<TRELLO_API_KEY>/g, testEnv.trelloApiKey)
      .replace(/<TRELLO_TOKEN>/g, testEnv.trelloToken)
      .replace(/<TRELLO_ORGANIZATION_ID>/g, testEnv.trelloOrganizationId);

    const metadataEvent = JSON.parse(metadataPayloadString);

    // Send metadata request
    let metadataResponse;
    try {
      metadataResponse = await sendEventToSnapIn(metadataEvent);
    } catch (error) {
      throw new Error(
        `Failed to send metadata event to snap-in: ${error instanceof Error ? error.message : String(error)}. ` +
        'This indicates an issue with the snap-in server or the metadata retrieval function.'
      );
    }

    if (!metadataResponse || !metadataResponse.function_result || !metadataResponse.function_result.success) {
      throw new Error(
        `Failed to retrieve external domain metadata. ` +
        `Response: ${JSON.stringify(metadataResponse, null, 2)}. ` +
        'The get_external_domain_metadata function did not return a successful result.'
      );
    }

    const metadata = metadataResponse.function_result.metadata;
    if (!metadata) {
      throw new Error(
        `External domain metadata is missing from the response. ` +
        `Function result: ${JSON.stringify(metadataResponse.function_result, null, 2)}. ` +
        'The metadata field should contain the external domain metadata JSON object.'
      );
    }

    // Step 3: Create temporary metadata file
    console.log('Step 3: Creating temporary metadata file...');
    
    try {
      tempMetadataFile = path.join(os.tmpdir(), `external_domain_metadata_${Date.now()}.json`);
      fs.writeFileSync(tempMetadataFile, JSON.stringify(metadata, null, 2));
      
      if (!fs.existsSync(tempMetadataFile)) {
        throw new Error(`Failed to create temporary metadata file at: ${tempMetadataFile}`);
      }
      
      console.log(`Temporary metadata file created at: ${tempMetadataFile}`);
    } catch (error) {
      throw new Error(
        `Failed to create temporary metadata file: ${error instanceof Error ? error.message : String(error)}. ` +
        'This is required for Chef CLI validation.'
      );
    }

    // Step 4: Invoke extraction function
    console.log('Step 4: Invoking extraction function...');
    
    const extractionPayloadPath = path.join(__dirname, 'data_extraction_test_payload.json');
    
    if (!fs.existsSync(extractionPayloadPath)) {
      throw new Error(
        `Data extraction test payload file not found at: ${extractionPayloadPath}. ` +
        'This file is required to invoke the extraction function.'
      );
    }

    let extractionPayload;
    try {
      const extractionPayloadContent = fs.readFileSync(extractionPayloadPath, 'utf8');
      extractionPayload = JSON.parse(extractionPayloadContent);
    } catch (error) {
      throw new Error(
        `Failed to parse data extraction test payload JSON: ${error instanceof Error ? error.message : String(error)}. ` +
        `File path: ${extractionPayloadPath}`
      );
    }

    // Replace placeholders in extraction payload
    const extractionPayloadString = JSON.stringify(extractionPayload)
      .replace(/<TRELLO_API_KEY>/g, testEnv.trelloApiKey)
      .replace(/<TRELLO_TOKEN>/g, testEnv.trelloToken)
      .replace(/<TRELLO_ORGANIZATION_ID>/g, testEnv.trelloOrganizationId);

    const extractionEvent = JSON.parse(extractionPayloadString);

    // Send extraction request
    let extractionResponse;
    try {
      extractionResponse = await sendEventToSnapIn(extractionEvent);
    } catch (error) {
      throw new Error(
        `Failed to send extraction event to snap-in: ${error instanceof Error ? error.message : String(error)}. ` +
        'This indicates an issue with the snap-in server or the extraction function.'
      );
    }

    if (!extractionResponse || !extractionResponse.function_result || !extractionResponse.function_result.success) {
      throw new Error(
        `Failed to invoke extraction function. ` +
        `Response: ${JSON.stringify(extractionResponse, null, 2)}. ` +
        'The extraction function did not return a successful result.'
      );
    }

    console.log('Extraction function invoked successfully, waiting for completion...');

    // Wait for extraction to complete
    await new Promise(resolve => setTimeout(resolve, 15000));

    // Step 5: Verify extracted files folder exists
    console.log('Step 5: Verifying extracted files folder...');
    
    if (!fs.existsSync(extractedFilesFolderPath)) {
      throw new Error(
        `Extracted files folder does not exist at path: ${extractedFilesFolderPath}. ` +
        'This folder should be created after the extraction function completes. ' +
        'This indicates that the extraction process did not complete successfully or ' +
        'the EXTRACTED_FILES_FOLDER_PATH environment variable is incorrect.'
      );
    }

    // Step 6: Find the extracted users file
    console.log('Step 6: Locating extracted users file...');
    
    let extractedUsersFile: string;
    try {
      const findCommand = `ls "${extractedFilesFolderPath}" | grep extractor_users | sort -r | head -n 1`;
      const findResult = execSync(findCommand, { encoding: 'utf8' }).trim();
      
      if (!findResult) {
        // List all files in the directory for debugging
        let availableFiles: string;
        try {
          availableFiles = execSync(`ls "${extractedFilesFolderPath}"`, { encoding: 'utf8' }).trim();
        } catch (lsError) {
          availableFiles = `Error listing files: ${lsError instanceof Error ? lsError.message : String(lsError)}`;
        }
        
        throw new Error(
          `No extracted users file found in folder: ${extractedFilesFolderPath}. ` +
          'Expected to find a file matching pattern "extractor_users". ' +
          `Available files in folder: ${availableFiles || 'none'}. ` +
          'This indicates that the users data extraction did not complete successfully.'
        );
      }
      
      extractedUsersFile = path.join(extractedFilesFolderPath, findResult);
      
      if (!fs.existsSync(extractedUsersFile)) {
        throw new Error(
          `Extracted users file does not exist at path: ${extractedUsersFile}. ` +
          'This indicates a file system issue or the extraction process did not complete properly.'
        );
      }
      
      console.log(`Found extracted users file: ${extractedUsersFile}`);
    } catch (error) {
      throw new Error(
        `Failed to locate extracted users file: ${error instanceof Error ? error.message : String(error)}. ` +
        `Searched in folder: ${extractedFilesFolderPath}`
      );
    }

    // Step 7: Validate normalization using Chef CLI
    console.log('Step 7: Validating normalization with Chef CLI...');
    
    try {
      const chefCommand = `"${chefCliPath}" validate-data -m "${tempMetadataFile}" -r users`;
      console.log(`Executing Chef CLI command: ${chefCommand}`);
      console.log(`Input file: ${extractedUsersFile}`);
      
      // Read the extracted file content
      const extractedFileContent = fs.readFileSync(extractedUsersFile, 'utf8');
      console.log(`Extracted file content preview (first 500 chars): ${extractedFileContent.substring(0, 500)}`);
      
      // Execute Chef CLI with the extracted file as stdin
      const chefResult = execSync(chefCommand, {
        input: extractedFileContent,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Print Chef CLI output to console
      console.log('Chef CLI stdout:', chefResult);
      
      // For successful validation, Chef CLI should return empty output
      if (chefResult.trim() !== '') {
        throw new Error(
          `Chef CLI validation failed. Expected empty output for successful validation, but received: "${chefResult}". ` +
          'This indicates that the users normalization function does not conform to the external domain metadata specification. ' +
          `Metadata file: ${tempMetadataFile}, ` +
          `Extracted file: ${extractedUsersFile}`
        );
      }
      
      console.log('Chef CLI validation completed successfully - normalization is valid');
      
    } catch (error) {
      // If it's an execution error, capture stderr as well
      if (error instanceof Error && 'stderr' in error) {
        const execError = error as any;
        console.error('Chef CLI stderr:', execError.stderr);
        
        throw new Error(
          `Chef CLI validation failed with error: ${error.message}. ` +
          `Stderr: ${execError.stderr}. ` +
          'This indicates either a Chef CLI execution error or normalization validation failure. ' +
          `Command: "${chefCliPath}" validate-data -m "${tempMetadataFile}" -r users, ` +
          `Input file: ${extractedUsersFile}`
        );
      }
      
      throw new Error(
        `Chef CLI validation failed: ${error instanceof Error ? error.message : String(error)}. ` +
        `Command: "${chefCliPath}" validate-data -m "${tempMetadataFile}" -r users, ` +
        `Input file: ${extractedUsersFile}`
      );
    }

    // All steps completed successfully
    console.log('All validation steps completed successfully');
    
    // Final assertions
    expect(fs.existsSync(extractedFilesFolderPath)).toBe(true);
    expect(fs.existsSync(extractedUsersFile)).toBe(true);
    expect(fs.existsSync(tempMetadataFile)).toBe(true);

  }, 90000); // Extended timeout for the comprehensive validation process
});