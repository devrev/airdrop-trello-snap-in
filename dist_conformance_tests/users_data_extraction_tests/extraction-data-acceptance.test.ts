import { getTestEnvironment, setupCallbackServer, sendEventToSnapIn, CallbackServerSetup, TestEnvironment } from './test-utils';

describe('Extraction Function - Data Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should complete data extraction and receive EXTRACTION_DATA_DONE callback with correct users artifact', async () => {
    // Create event payload based on data_extraction_test.json with environment variables
    const event = {
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

    console.log('Sending extraction event to snap-in server...');
    const response = await sendEventToSnapIn(event);
    
    if (!response.success) {
      console.error('Failed to send event to snap-in server:', {
        status: response.status,
        data: response.data,
        error: response.error,
        timestamp: new Date().toISOString(),
      });
      fail(`Failed to send event to snap-in server: ${response.error || 'Unknown error'}`);
    }

    expect(response.success).toBe(true);
    expect(response.status).toBe(200);

    console.log('Waiting for callback events from DevRev...');
    
    // Wait for callback events with timeout
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 1000; // 1 second
    let waitTime = 0;
    
    while (callbackServer.receivedEvents.length === 0 && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    if (callbackServer.receivedEvents.length === 0) {
      console.error('No callback events received within timeout period:', {
        maxWaitTime,
        snapInResponse: response.data,
        timestamp: new Date().toISOString(),
      });
      fail(`No callback events received within ${maxWaitTime}ms timeout`);
    }

    console.log(`Received ${callbackServer.receivedEvents.length} callback event(s)`);

    // Validate exactly one callback event received
    if (callbackServer.receivedEvents.length !== 1) {
      console.error('Expected exactly 1 callback event, but received:', {
        eventCount: callbackServer.receivedEvents.length,
        events: callbackServer.receivedEvents.map(e => ({
          timestamp: e.timestamp,
          eventType: e.event?.event_type,
          eventData: e.event?.event_data,
        })),
        timestamp: new Date().toISOString(),
      });
      fail(`Expected exactly 1 callback event, but received ${callbackServer.receivedEvents.length}`);
    }

    const callbackEvent = callbackServer.receivedEvents[0].event;
    
    // Validate event_type is EXTRACTION_DATA_DONE
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      console.error('Expected EXTRACTION_DATA_DONE event, but received:', {
        actualEventType: callbackEvent.event_type,
        fullEvent: callbackEvent,
        timestamp: new Date().toISOString(),
      });
      fail(`Expected event_type to be 'EXTRACTION_DATA_DONE', but got '${callbackEvent.event_type}'`);
    }

    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Validate artifacts array exists and has length > 0
    const artifactArray = callbackEvent.event_data?.artifacts;
    
    if (!Array.isArray(artifactArray)) {
      console.error('Expected artifacts array in event_data, but found:', {
        eventData: callbackEvent.event_data,
        artifactsType: typeof artifactArray,
        artifactsValue: artifactArray,
        timestamp: new Date().toISOString(),
      });
      fail(`Expected artifacts to be an array, but got ${typeof artifactArray}`);
    }

    if (artifactArray.length === 0) {
      console.error('Expected artifacts array to have length > 0, but found:', {
        artifactArrayLength: artifactArray.length,
        eventData: callbackEvent.event_data,
        timestamp: new Date().toISOString(),
      });
      fail('Expected artifacts array to have length > 0, but it was empty');
    }

    expect(Array.isArray(artifactArray)).toBe(true);
    expect(artifactArray.length).toBeGreaterThan(0);

    // Find users artifact
    const usersArtifact = artifactArray.find(artifact => artifact.item_type === 'users');
    
    if (!usersArtifact) {
      console.error('Expected to find artifact with item_type="users", but found artifacts:', {
        artifactArray: artifactArray.map(a => ({
          item_type: a.item_type,
          item_count: a.item_count,
        })),
        timestamp: new Date().toISOString(),
      });
      fail('Expected to find artifact with item_type="users", but none found');
    }

    // Validate users artifact has item_count = 9
    if (usersArtifact.item_count !== 9) {
      console.error('Expected users artifact to have item_count=9, but found:', {
        actualItemCount: usersArtifact.item_count,
        usersArtifact,
        allArtifacts: artifactArray,
        timestamp: new Date().toISOString(),
      });
      
      if (usersArtifact.item_count < 9) {
        fail(`Expected users artifact item_count to be 9, but got ${usersArtifact.item_count}. This indicates that not all users data was extracted.`);
      } else {
        fail(`Expected users artifact item_count to be 9, but got ${usersArtifact.item_count}`);
      }
    }

    expect(usersArtifact.item_count).toBe(9);

    console.log('Acceptance test completed successfully:', {
      callbackEventType: callbackEvent.event_type,
      artifactCount: artifactArray.length,
      usersItemCount: usersArtifact.item_count,
      timestamp: new Date().toISOString(),
    });
  }, 90000); // 90 second timeout for this comprehensive test
});