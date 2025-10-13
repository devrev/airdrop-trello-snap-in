import { TestUtils } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as os from 'os';

describe('Cards Normalization Validation Acceptance Test', () => {
  let env: ReturnType<typeof TestUtils.getEnvironment>;
  let tempMetadataFile: string | null = null;

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
    
    // Cleanup temporary metadata file
    if (tempMetadataFile && fs.existsSync(tempMetadataFile)) {
      try {
        fs.unlinkSync(tempMetadataFile);
      } catch (error) {
        console.warn(`Failed to cleanup temporary metadata file ${tempMetadataFile}:`, error);
      }
    }
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  /**
   * Validates required environment variables for the test
   */
  function validateEnvironmentVariables(): { extractedFilesFolderPath: string; chefCliPath: string } {
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
    const chefCliPath = process.env.CHEF_CLI_PATH;

    if (!extractedFilesFolderPath) {
      throw new Error(
        'Missing required environment variable: EXTRACTED_FILES_FOLDER_PATH. ' +
        'This should point to the folder where extracted files are stored.'
      );
    }

    if (!chefCliPath) {
      throw new Error(
        'Missing required environment variable: CHEF_CLI_PATH. ' +
        'This should point to the chef-cli executable.'
      );
    }

    return { extractedFilesFolderPath, chefCliPath };
  }

  /**
   * Creates the extraction test event from the JSON payload file with credential replacement
   */
  function createExtractionTestEvent() {
    try {
      // Read the JSON payload file from resources
      const payloadPath = path.join(__dirname, 'data-extraction-test-payload.json');
      const payloadContent = fs.readFileSync(payloadPath, 'utf8');
      
      // Replace placeholders with actual credentials
      const replacedContent = payloadContent
        .replace(/<TRELLO_API_KEY>/g, env.trelloApiKey)
        .replace(/<TRELLO_TOKEN>/g, env.trelloToken)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.trelloOrganizationId);
      
      const event = JSON.parse(replacedContent);
      
      // Validate that the event has the expected structure
      if (!event.payload || !event.context || !event.execution_metadata) {
        throw new Error('Invalid extraction event structure: missing required top-level properties');
      }
      
      if (!event.payload.event_type) {
        throw new Error('Invalid extraction event structure: missing event_type in payload');
      }
      
      if (event.payload.event_type !== 'EXTRACTION_DATA_START') {
        throw new Error(`Invalid extraction event structure: expected event_type 'EXTRACTION_DATA_START', got '${event.payload.event_type}'`);
      }
      
      if (!event.payload.connection_data || !event.payload.connection_data.key) {
        throw new Error('Invalid extraction event structure: missing connection_data.key in payload');
      }
      
      return event;
    } catch (error) {
      throw new Error(`Failed to create extraction test event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates the metadata event from the external domain metadata event payload
   */
  function createMetadataEvent() {
    try {
      const metadataEvent = {
        "payload": {
          "connection_data": {
            "key": `key=${env.trelloApiKey}&token=${env.trelloToken}`,
            "org_id": env.trelloOrganizationId
          },
          "event_context": {
            "callback_url": "http://localhost:8002/callback",
            "external_sync_unit_id": env.trelloOrganizationId
          }
        },
        "context": {
          "dev_oid": "test-org-id",
          "source_id": "test-source-id",
          "snap_in_id": "test-snap-in-id",
          "snap_in_version_id": "test-snap-in-version-id",
          "service_account_id": "test-service-account-id",
          "secrets": {
            "service_account_token": "test-token"
          }
        },
        "execution_metadata": {
          "request_id": "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
          "function_name": "get_external_domain_metadata",
          "event_type": "test-event",
          "devrev_endpoint": "http://localhost:8003"
        },
        "input_data": {
          "global_values": {},
          "event_sources": {}
        }
      };
      
      return metadataEvent;
    } catch (error) {
      throw new Error(`Failed to create metadata event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves the external domain metadata by calling the snap-in function
   */
  async function getExternalDomainMetadata(): Promise<any> {
    try {
      console.log('Retrieving external domain metadata from snap-in...');
      
      const metadataEvent = createMetadataEvent();
      const response = await TestUtils.sendEventToSnapIn(metadataEvent);
      
      if (response.error) {
        throw new Error(
          `Failed to retrieve external domain metadata: ${JSON.stringify(response.error, null, 2)}`
        );
      }
      
      if (!response.function_result) {
        throw new Error(
          `External domain metadata response missing function_result. ` +
          `Full response: ${JSON.stringify(response, null, 2)}`
        );
      }
      
      if (response.function_result.status !== 'success') {
        throw new Error(
          `External domain metadata function returned failure status. ` +
          `Response: ${JSON.stringify(response.function_result, null, 2)}`
        );
      }
      
      if (!response.function_result.metadata) {
        throw new Error(
          `External domain metadata response missing metadata field. ` +
          `Function result: ${JSON.stringify(response.function_result, null, 2)}`
        );
      }
      
      console.log('Successfully retrieved external domain metadata');
      return response.function_result.metadata;
    } catch (error) {
      throw new Error(`Failed to get external domain metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a temporary file with the external domain metadata
   */
  function createTemporaryMetadataFile(metadata: any): string {
    try {
      const tempDir = os.tmpdir();
      const tempFileName = `external-domain-metadata-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2), 'utf8');
      
      console.log(`Created temporary metadata file: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      throw new Error(`Failed to create temporary metadata file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds the extracted cards file using the specified command pattern
   */
  function findExtractedCardsFile(extractedFilesFolderPath: string): string {
    try {
      console.log(`Looking for extracted cards file in: ${extractedFilesFolderPath}`);
      
      // Check if the extracted files folder exists
      if (!fs.existsSync(extractedFilesFolderPath)) {
        throw new Error(
          `Extracted files folder does not exist: ${extractedFilesFolderPath}. ` +
          `This indicates that the extraction function may not have run successfully or ` +
          `the EXTRACTED_FILES_FOLDER_PATH environment variable is incorrect.`
        );
      }
      
      // Execute the command to find the extracted cards file
      const findCommand = `ls "${extractedFilesFolderPath}" | grep extractor_cards | sort -r | head -n 1`;
      console.log(`Executing command: ${findCommand}`);
      
      let fileName: string;
      try {
        fileName = execSync(findCommand, { encoding: 'utf8' }).trim();
      } catch (error) {
        throw new Error(
          `Failed to execute find command: ${findCommand}. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `This may indicate that no extracted cards files exist in the folder.`
        );
      }
      
      if (!fileName) {
        // List all files in the directory for debugging
        let allFiles: string[];
        try {
          allFiles = fs.readdirSync(extractedFilesFolderPath);
        } catch (error) {
          allFiles = ['<failed to read directory>'];
        }
        
        throw new Error(
          `No extracted cards file found in ${extractedFilesFolderPath}. ` +
          `The command '${findCommand}' returned empty result. ` +
          `All files in directory: ${JSON.stringify(allFiles, null, 2)}. ` +
          `This indicates that the extraction function may not have extracted cards data successfully.`
        );
      }
      
      const fullFilePath = path.join(extractedFilesFolderPath, fileName);
      
      // Verify the file exists
      if (!fs.existsSync(fullFilePath)) {
        throw new Error(
          `Extracted cards file does not exist: ${fullFilePath}. ` +
          `Found filename: ${fileName}, but file is not accessible.`
        );
      }
      
      console.log(`Found extracted cards file: ${fullFilePath}`);
      return fullFilePath;
    } catch (error) {
      throw new Error(`Failed to find extracted cards file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates the chef-cli executable is available
   */
  function validateChefCliAvailable(chefCliPath: string): void {
    try {
      console.log(`Checking chef-cli availability at: ${chefCliPath}`);
      
      if (!fs.existsSync(chefCliPath)) {
        throw new Error(
          `Chef-cli executable not found at: ${chefCliPath}. ` +
          `Please ensure the CHEF_CLI_PATH environment variable points to a valid chef-cli executable.`
        );
      }
      
      // Try to execute chef-cli to verify it's working
      try {
        execSync(`"${chefCliPath}" --help`, { encoding: 'utf8', timeout: 10000 });
        console.log('Chef-cli is available and working');
      } catch (error) {
        throw new Error(
          `Chef-cli executable exists but failed to run: ${chefCliPath}. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
          `Please ensure the chef-cli executable has proper permissions and dependencies.`
        );
      }
    } catch (error) {
      throw new Error(`Chef-cli validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes chef-cli validation and returns the result
   */
  function executeChefCliValidation(chefCliPath: string, metadataFilePath: string, extractedFilePath: string): { stdout: string; stderr: string; success: boolean } {
    try {
      console.log('Executing chef-cli validation...');
      console.log(`Command: "${chefCliPath}" validate-data -m "${metadataFilePath}" -r cards`);
      console.log(`Input file: ${extractedFilePath}`);
      
      // Read the extracted file content
      const extractedFileContent = fs.readFileSync(extractedFilePath, 'utf8');
      console.log(`Extracted file size: ${extractedFileContent.length} characters`);
      
      // Execute chef-cli with the extracted file as stdin
      const command = `"${chefCliPath}" validate-data -m "${metadataFilePath}" -r cards`;
      
      let stdout: string;
      let stderr: string;
      let success: boolean;
      
      try {
        stdout = execSync(command, { 
          input: extractedFileContent,
          encoding: 'utf8',
          timeout: 30000, // 30 second timeout
          stdio: ['pipe', 'pipe', 'pipe']
        });
        stderr = '';
        success = true;
        
        console.log('Chef-cli validation completed successfully');
      } catch (error: any) {
        stdout = error.stdout || '';
        stderr = error.stderr || '';
        success = false;
        
        console.log('Chef-cli validation completed with errors');
      }
      
      // Always print stdout and stderr as required
      console.log('=== CHEF-CLI STDOUT ===');
      console.log(stdout);
      console.log('=== CHEF-CLI STDERR ===');
      console.log(stderr);
      console.log('=== END CHEF-CLI OUTPUT ===');
      
      return { stdout, stderr, success };
    } catch (error) {
      throw new Error(`Failed to execute chef-cli validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  describe('Acceptance Test: Cards Normalization Validation with Chef-CLI', () => {
    it('should validate cards normalization using chef-cli tool', async () => {
      let extractedFilesFolderPath: string = '';
      let chefCliPath: string = '';

      try {
        // Step 1: Validate environment variables
        console.log('Step 1: Validating environment variables...');
        const envVars = validateEnvironmentVariables();
        extractedFilesFolderPath = envVars.extractedFilesFolderPath;
        chefCliPath = envVars.chefCliPath;
        
        // Step 2: Validate chef-cli is available
        console.log('Step 2: Validating chef-cli availability...');
        validateChefCliAvailable(chefCliPath);
        
        // Step 3: Invoke extraction function
        console.log('Step 3: Invoking extraction function...');
        const extractionEvent = createExtractionTestEvent();
        
        console.log('Sending EXTRACTION_DATA_START event to snap-in server...');
        console.log('Event payload summary:', {
          event_type: extractionEvent.payload.event_type,
          external_sync_unit_id: extractionEvent.payload.event_context.external_sync_unit_id,
          external_sync_unit_name: extractionEvent.payload.event_context.external_sync_unit_name,
          org_id: extractionEvent.payload.connection_data.org_id,
        });
        
        // Send extraction event to snap-in server
        const extractionResponse = await TestUtils.sendEventToSnapIn(extractionEvent);
        
        // Validate that the snap-in accepted the event
        if (extractionResponse.error) {
          throw new Error(
            `Snap-in server returned error during extraction: ${JSON.stringify(extractionResponse.error, null, 2)}`
          );
        }
        
        console.log('Extraction event sent successfully, waiting for completion...');
        
        // Wait for extraction completion
        let callbacks: any[];
        try {
          callbacks = await TestUtils.waitForCallback(45000); // 45 second timeout for extraction
        } catch (error) {
          throw new Error(
            `No callback received from DevRev within timeout during extraction. ` +
            `This indicates the extraction function may not be working correctly. ` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        
        console.log(`Received ${callbacks.length} callback(s) from DevRev:`, 
          callbacks.map(cb => ({ event_type: cb.event_type, has_event_data: !!cb.event_data })));
        
        // Find the EXTRACTION_DATA_DONE callback
        const doneCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_DONE');
        
        if (!doneCallback) {
          // Check for error callbacks to provide better debugging info
          const errorCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_ERROR');
          if (errorCallback) {
            throw new Error(
              `Expected EXTRACTION_DATA_DONE callback but received EXTRACTION_DATA_ERROR instead. ` +
              `Error details: ${JSON.stringify(errorCallback.event_data, null, 2)}`
            );
          }
          
          throw new Error(
            `Expected EXTRACTION_DATA_DONE callback but received different event types. ` +
            `Received callbacks: ${JSON.stringify(callbacks.map(cb => ({ 
              event_type: cb.event_type, 
              event_data: cb.event_data 
            })), null, 2)}`
          );
        }
        
        console.log('Extraction completed successfully');
        
        // Step 4: Get external domain metadata
        console.log('Step 4: Retrieving external domain metadata...');
        const metadata = await getExternalDomainMetadata();
        
        // Step 5: Create temporary metadata file
        console.log('Step 5: Creating temporary metadata file...');
        tempMetadataFile = createTemporaryMetadataFile(metadata);
        
        // Step 6: Find extracted cards file
        console.log('Step 6: Finding extracted cards file...');
        const extractedFilePath = findExtractedCardsFile(extractedFilesFolderPath);
        
        // Step 7: Execute chef-cli validation
        console.log('Step 7: Executing chef-cli validation...');
        const validationResult = executeChefCliValidation(chefCliPath, tempMetadataFile, extractedFilePath);
        
        // Step 8: Validate chef-cli results
        console.log('Step 8: Validating chef-cli results...');
        
        if (!validationResult.success) {
          throw new Error(
            `Chef-cli validation failed. This indicates that the cards normalization function ` +
            `does not produce data that conforms to the external domain metadata specification. ` +
            `Chef-cli stdout: ${validationResult.stdout}. ` +
            `Chef-cli stderr: ${validationResult.stderr}.`
          );
        }
        
        // For successful validation, chef-cli should return empty output
        if (validationResult.stdout.trim() !== '') {
          throw new Error(
            `Chef-cli validation should return empty output for successful validation, ` +
            `but returned: "${validationResult.stdout.trim()}". ` +
            `This indicates that the cards normalization function may have validation issues. ` +
            `Chef-cli stderr: ${validationResult.stderr}.`
          );
        }
        
        if (validationResult.stderr.trim() !== '') {
          throw new Error(
            `Chef-cli validation should not produce stderr output for successful validation, ` +
            `but stderr contained: "${validationResult.stderr.trim()}". ` +
            `This may indicate warnings or issues with the cards normalization function. ` +
            `Chef-cli stdout: ${validationResult.stdout}.`
          );
        }
        
        console.log('✅ Cards normalization validation passed: Chef-cli returned empty output, indicating successful validation');
        
        // All validations passed
        expect(validationResult.success).toBe(true);
        expect(validationResult.stdout.trim()).toBe('');
        expect(validationResult.stderr.trim()).toBe('');
        
      } catch (error) {
        // Provide comprehensive error information for debugging
        console.error('Cards normalization validation test failed:', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          extracted_files_folder_path: extractedFilesFolderPath,
          chef_cli_path: chefCliPath,
          temp_metadata_file: tempMetadataFile,
        });
        
        throw error;
      }
    }, 120000); // 120 second test timeout to account for extraction and validation
  });
});