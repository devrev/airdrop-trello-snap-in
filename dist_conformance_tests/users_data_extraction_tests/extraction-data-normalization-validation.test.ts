import { getTestEnvironment, setupCallbackServer, sendEventToSnapIn, CallbackServerSetup, TestEnvironment } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

describe('Extraction Function - Normalization Validation Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;
  let tempMetadataFile: string | null = null;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
    // Clean up temporary metadata file
    if (tempMetadataFile && fs.existsSync(tempMetadataFile)) {
      try {
        fs.unlinkSync(tempMetadataFile);
      } catch (error) {
        console.warn('Failed to clean up temporary metadata file:', tempMetadataFile, error);
      }
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should validate users normalization function using chef-cli tool', async () => {
    const testStartTime = new Date().toISOString();
    console.log(`Starting normalization validation acceptance test at: ${testStartTime}`);

    // Step 1: Validate required environment variables
    console.log('Step 1: Validating environment variables...');
    
    const chefCliPath = process.env.CHEF_CLI_PATH;
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;

    if (!chefCliPath) {
      const errorMsg = 'CHEF_CLI_PATH environment variable is required for normalization validation test';
      console.error('Environment validation failed:', {
        error: errorMsg,
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('CHEF')),
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    if (!extractedFilesFolderPath) {
      const errorMsg = 'EXTRACTED_FILES_FOLDER_PATH environment variable is required for normalization validation test';
      console.error('Environment validation failed:', {
        error: errorMsg,
        availableEnvVars: Object.keys(process.env).filter(key => key.includes('EXTRACT')),
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    // Validate chef-cli executable exists and is accessible
    if (!fs.existsSync(chefCliPath)) {
      const errorMsg = `Chef CLI executable not found at path: ${chefCliPath}`;
      console.error('Chef CLI validation failed:', {
        error: errorMsg,
        chefCliPath,
        pathExists: false,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    try {
      // Test if chef-cli is executable
      execSync(`"${chefCliPath}" --help`, { timeout: 5000, stdio: 'pipe' });
      console.log('Chef CLI executable validation successful');
    } catch (error) {
      const errorMsg = `Chef CLI is not executable or accessible: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Chef CLI execution test failed:', {
        error: errorMsg,
        chefCliPath,
        execError: error,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    console.log('Environment validation completed successfully:', {
      chefCliPath,
      extractedFilesFolderPath,
      timestamp: new Date().toISOString(),
    });

    // Step 2: Get External Domain Metadata JSON object
    console.log('Step 2: Retrieving External Domain Metadata...');
    
    const metadataEvent = {
      payload: {
        connection_data: {
          key: `key=${testEnv.trelloApiKey}&token=${testEnv.trelloToken}`,
          org_id: testEnv.trelloOrganizationId
        },
        event_context: {
          callback_url: "http://localhost:8002/callback",
          external_sync_unit_id: testEnv.trelloOrganizationId
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

    const metadataResponse = await sendEventToSnapIn(metadataEvent);
    
    if (!metadataResponse.success) {
      const errorMsg = `Failed to retrieve external domain metadata: ${metadataResponse.error || 'Unknown error'}`;
      console.error('Metadata retrieval failed:', {
        error: errorMsg,
        status: metadataResponse.status,
        data: metadataResponse.data,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    if (!metadataResponse.data?.function_result?.metadata) {
      const errorMsg = 'External domain metadata not found in response';
      console.error('Metadata validation failed:', {
        error: errorMsg,
        responseData: metadataResponse.data,
        hasMetadata: !!metadataResponse.data?.function_result?.metadata,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    const metadata = metadataResponse.data.function_result.metadata;
    console.log('External domain metadata retrieved successfully');

    // Step 3: Store metadata in temporary file
    console.log('Step 3: Creating temporary metadata file...');
    
    try {
      tempMetadataFile = path.join(os.tmpdir(), `external-domain-metadata-${Date.now()}.json`);
      fs.writeFileSync(tempMetadataFile, JSON.stringify(metadata, null, 2));
      console.log('Temporary metadata file created:', {
        filePath: tempMetadataFile,
        fileSize: fs.statSync(tempMetadataFile).size,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMsg = `Failed to create temporary metadata file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Temporary file creation failed:', {
        error: errorMsg,
        tempMetadataFile,
        writeError: error,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    // Step 4: Invoke The Extraction Function
    console.log('Step 4: Invoking extraction function...');
    
    const extractionEvent = {
      payload: {
        connection_data: {
          key: `key=${testEnv.trelloApiKey}&token=${testEnv.trelloToken}`,
          key_type: "",
          org_id: testEnv.trelloOrganizationId,
          org_name: "Trello Workspace"
        },
        event_context: {
          callback_url: "http://localhost:8002/callback",
          dev_oid: "DEV-36shCCBEAA",
          dev_org: "DEV-36shCCBEAA",
          dev_org_id: "DEV-36shCCBEAA",
          dev_uid: "DEVU-1",
          dev_user: "DEVU-1",
          dev_user_id: "DEVU-1",
          event_type_adaas: "",
          external_sync_unit: "68e8befbf2f641caa9b1e275",
          external_sync_unit_id: "68e8befbf2f641caa9b1e275",
          external_sync_unit_name: "2025-10-10 - Board with 12 cards",
          external_system: testEnv.trelloOrganizationId,
          external_system_id: testEnv.trelloOrganizationId,
          external_system_name: "Trello",
          external_system_type: "ADaaS",
          import_slug: "trello-snapin-devrev",
          mode: "INITIAL",
          request_id: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
          request_id_adaas: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
          run_id: "cbbe2419-1f86-4737-aa78-6bb7118ce52c",
          sequence_version: "6",
          snap_in_slug: "trello-snapin-devrev",
          snap_in_version_id: "don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in_package/b66dda95-cf9e-48be-918c-8439ecdd548e:snap_in_version/50d4660e-dad9-41d6-9169-8a7e96b2d7fa",
          sync_run: "cbbe2419-1f86-4737-aa78-6bb7118ce52c",
          sync_run_id: "cbbe2419-1f86-4737-aa78-6bb7118ce52c",
          sync_tier: "sync_tier_2",
          sync_unit: "don:integration:dvrv-eu-1:devo/36shCCBEAA:external_system_type/ADAAS:external_system/6752eb95c833e6b206fcf388:sync_unit/984c894e-71e5-4e94-b484-40b839c9a916",
          sync_unit_id: "984c894e-71e5-4e94-b484-40b839c9a916",
          uuid: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
          worker_data_url: "http://localhost:8003/external-worker"
        },
        event_type: "EXTRACTION_DATA_START"
      },
      context: {
        dev_oid: "don:identity:dvrv-eu-1:devo/36shCCBEAA",
        automation_id: "",
        source_id: "",
        snap_in_id: "don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in/03a783b1-5d9f-4af8-b958-e401f2022439",
        snap_in_version_id: "don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in_package/b66dda95-cf9e-48be-918c-8439ecdd548e:snap_in_version/50d4660e-dad9-41d6-9169-8a7e96b2d7fa",
        service_account_id: "don:identity:dvrv-eu-1:devo/36shCCBEAA:svcacc/42",
        secrets: {
          service_account_token: "test-service-account-token"
        },
        user_id: "don:identity:dvrv-eu-1:devo/36shCCBEAA:devu/1",
        event_id: "",
        execution_id: "13765595327067933408"
      },
      execution_metadata: {
        request_id: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
        function_name: "extraction",
        event_type: "EXTRACTION_DATA_START",
        devrev_endpoint: "http://localhost:8003"
      },
      input_data: {
        global_values: {},
        event_sources: {},
        keyrings: null,
        resources: {
          keyrings: {},
          tags: {}
        }
      }
    };

    const extractionResponse = await sendEventToSnapIn(extractionEvent);
    
    if (!extractionResponse.success) {
      const errorMsg = `Failed to invoke extraction function: ${extractionResponse.error || 'Unknown error'}`;
      console.error('Extraction function invocation failed:', {
        error: errorMsg,
        status: extractionResponse.status,
        data: extractionResponse.data,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    console.log('Extraction function invoked successfully');

    // Step 5: Wait for callback and extracted files
    console.log('Step 5: Waiting for extraction completion and file creation...');
    
    // Wait for callback events
    const maxCallbackWaitTime = 60000; // 60 seconds
    const checkInterval = 1000; // 1 second
    let callbackWaitTime = 0;
    
    while (callbackServer.receivedEvents.length === 0 && callbackWaitTime < maxCallbackWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      callbackWaitTime += checkInterval;
      
      if (callbackWaitTime % 10000 === 0) {
        console.log(`Still waiting for callback... ${callbackWaitTime}ms elapsed`);
      }
    }

    if (callbackServer.receivedEvents.length === 0) {
      const errorMsg = `No callback events received within ${maxCallbackWaitTime}ms timeout`;
      console.error('Callback timeout error:', {
        error: errorMsg,
        maxCallbackWaitTime,
        extractionResponse: extractionResponse.data,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    // Validate callback event is EXTRACTION_DATA_DONE
    const callbackEvent = callbackServer.receivedEvents[0].event;
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      const errorMsg = `Expected EXTRACTION_DATA_DONE callback, but received: ${callbackEvent.event_type}`;
      console.error('Unexpected callback event type:', {
        error: errorMsg,
        actualEventType: callbackEvent.event_type,
        fullCallbackEvent: callbackEvent,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    console.log('Extraction completed successfully, callback received');

    // Step 6: Validate extracted files folder exists
    console.log('Step 6: Validating extracted files folder...');
    
    if (!fs.existsSync(extractedFilesFolderPath)) {
      const errorMsg = `Extracted files folder does not exist: ${extractedFilesFolderPath}`;
      console.error('Extracted files folder validation failed:', {
        error: errorMsg,
        extractedFilesFolderPath,
        folderExists: false,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    console.log('Extracted files folder exists:', {
      folderPath: extractedFilesFolderPath,
      timestamp: new Date().toISOString(),
    });

    // Step 7: Find the users extracted file
    console.log('Step 7: Finding users extracted file...');
    
    let extractedUsersFile: string;
    try {
      const findCommand = `ls "${extractedFilesFolderPath}" | grep extractor_users | sort -r | head -n 1`;
      const findResult = execSync(findCommand, { encoding: 'utf8', timeout: 10000 }).trim();
      
      if (!findResult) {
        const errorMsg = 'No users extracted file found in extracted files folder';
        
        // Get folder contents for debugging
        let folderContents: string[] = [];
        try {
          folderContents = fs.readdirSync(extractedFilesFolderPath);
        } catch (readError) {
          console.warn('Could not read folder contents for debugging:', readError);
        }
        
        console.error('Users extracted file not found:', {
          error: errorMsg,
          extractedFilesFolderPath,
          findCommand,
          findResult,
          folderContents,
          timestamp: new Date().toISOString(),
        });
        fail(errorMsg);
      }
      
      extractedUsersFile = path.join(extractedFilesFolderPath, findResult);
      
      if (!fs.existsSync(extractedUsersFile)) {
        const errorMsg = `Users extracted file does not exist: ${extractedUsersFile}`;
        console.error('Users extracted file validation failed:', {
          error: errorMsg,
          extractedUsersFile,
          fileExists: false,
          findResult,
          timestamp: new Date().toISOString(),
        });
        fail(errorMsg);
      }
      
      console.log('Users extracted file found:', {
        fileName: findResult,
        fullPath: extractedUsersFile,
        fileSize: fs.statSync(extractedUsersFile).size,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      const errorMsg = `Failed to find users extracted file: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('File search failed:', {
        error: errorMsg,
        extractedFilesFolderPath,
        searchError: error,
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    // Step 8: Run chef-cli validation
    console.log('Step 8: Running chef-cli validation...');
    
    try {
      const chefCommand = `"${chefCliPath}" validate-data -m "${tempMetadataFile}" -r users`;
      console.log('Executing chef-cli command:', {
        command: chefCommand,
        metadataFile: tempMetadataFile,
        extractedFile: extractedUsersFile,
        timestamp: new Date().toISOString(),
      });
      
      // Read the extracted file content
      const extractedFileContent = fs.readFileSync(extractedUsersFile, 'utf8');
      
      // Execute chef-cli with the extracted file content as stdin
      const chefResult = execSync(chefCommand, {
        input: extractedFileContent,
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Print chef-cli output to console as required
      console.log('Chef-CLI stdout:', chefResult);
      
      // For successful validation, chef-cli should return empty output
      if (chefResult.trim() !== '') {
        const errorMsg = 'Chef-CLI validation failed - output is not empty';
        console.error('Chef-CLI validation failed:', {
          error: errorMsg,
          chefOutput: chefResult,
          chefCommand,
          extractedFile: extractedUsersFile,
          extractedFileSize: fs.statSync(extractedUsersFile).size,
          timestamp: new Date().toISOString(),
        });
        fail(`${errorMsg}. Chef-CLI output: ${chefResult}`);
      }
      
      console.log('Chef-CLI validation successful - empty output received');
      
    } catch (error: any) {
      const errorMsg = `Chef-CLI execution failed: ${error.message || 'Unknown error'}`;
      
      // Print stderr if available
      if (error.stderr) {
        console.error('Chef-CLI stderr:', error.stderr.toString());
      }
      
      console.error('Chef-CLI execution error:', {
        error: errorMsg,
        chefCliPath,
        tempMetadataFile,
        extractedUsersFile,
        exitCode: error.status,
        stderr: error.stderr?.toString(),
        stdout: error.stdout?.toString(),
        timestamp: new Date().toISOString(),
      });
      fail(errorMsg);
    }

    const testEndTime = new Date().toISOString();
    console.log('Normalization validation acceptance test completed successfully:', {
      testStartTime,
      testEndTime,
      chefCliPath,
      extractedFilesFolderPath,
      extractedUsersFile,
      tempMetadataFile,
      timestamp: testEndTime,
    });
    
  }, 120000); // 120 second timeout for this comprehensive test
});