import { getTestEnvironment, setupCallbackServer, sendEventToSnapIn, controlRateLimiting, CallbackServerSetup, TestEnvironment } from './test-utils';

describe('Extraction Function - Rate Limiting Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;
  const testName = 'extraction-data-rate-limiting-test';

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
    // Ensure rate limiting is ended even if test fails
    await controlRateLimiting('end');
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should handle rate limiting and emit EXTRACTION_DATA_DELAY event', async () => {
    console.log(`Starting rate limiting acceptance test: ${testName}`);

    // Step 1: Start rate limiting
    console.log('Step 1: Starting rate limiting...');
    const startRateLimitingResult = await controlRateLimiting('start', testName);
    
    if (!startRateLimitingResult.success) {
      console.error('Failed to start rate limiting:', {
        error: startRateLimitingResult.error,
        testName,
        timestamp: new Date().toISOString(),
      });
      fail(`Failed to start rate limiting: ${startRateLimitingResult.error || 'Unknown error'}`);
    }

    expect(startRateLimitingResult.success).toBe(true);
    console.log('Rate limiting started successfully');

    try {
      // Step 2: Send EXTRACTION_DATA_START event
      console.log('Step 2: Sending EXTRACTION_DATA_START event...');
      
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

      const response = await sendEventToSnapIn(event);
      
      if (!response.success) {
        console.error('Failed to send event to snap-in server during rate limiting test:', {
          status: response.status,
          data: response.data,
          error: response.error,
          testName,
          timestamp: new Date().toISOString(),
        });
        fail(`Failed to send event to snap-in server: ${response.error || 'Unknown error'}`);
      }

      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
      console.log('Event sent successfully to snap-in server');

      // Wait for callback events with timeout
      console.log('Waiting for EXTRACTION_DATA_DELAY callback event...');
      const maxWaitTime = 60000; // 60 seconds
      const checkInterval = 1000; // 1 second
      let waitTime = 0;
      
      while (callbackServer.receivedEvents.length === 0 && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
        
        if (waitTime % 10000 === 0) {
          console.log(`Still waiting for callback... ${waitTime}ms elapsed`);
        }
      }

      if (callbackServer.receivedEvents.length === 0) {
        console.error('No callback events received within timeout period during rate limiting test:', {
          maxWaitTime,
          snapInResponse: response.data,
          testName,
          rateLimitingActive: true,
          timestamp: new Date().toISOString(),
        });
        fail(`No callback events received within ${maxWaitTime}ms timeout during rate limiting test`);
      }

      console.log(`Received ${callbackServer.receivedEvents.length} callback event(s) during rate limiting test`);

      // Validate exactly one callback event received
      if (callbackServer.receivedEvents.length !== 1) {
        console.error('Expected exactly 1 callback event during rate limiting test, but received:', {
          eventCount: callbackServer.receivedEvents.length,
          events: callbackServer.receivedEvents.map(e => ({
            timestamp: e.timestamp,
            eventType: e.event?.event_type,
            eventData: e.event?.event_data,
          })),
          testName,
          timestamp: new Date().toISOString(),
        });
        fail(`Expected exactly 1 callback event during rate limiting test, but received ${callbackServer.receivedEvents.length}`);
      }

      const callbackEvent = callbackServer.receivedEvents[0].event;
      
      // Validate event_type is EXTRACTION_DATA_DELAY
      if (callbackEvent.event_type !== 'EXTRACTION_DATA_DELAY') {
        console.error('Expected EXTRACTION_DATA_DELAY event during rate limiting test, but received:', {
          actualEventType: callbackEvent.event_type,
          fullEvent: callbackEvent,
          testName,
          rateLimitingActive: true,
          timestamp: new Date().toISOString(),
        });
        fail(`Expected event_type to be 'EXTRACTION_DATA_DELAY' during rate limiting test, but got '${callbackEvent.event_type}'`);
      }

      expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DELAY');

      // Validate delay field exists and is a positive number
      const delayValue = callbackEvent.event_data?.delay;
      
      if (typeof delayValue !== 'number' || delayValue <= 0) {
        console.error('Expected positive delay value in EXTRACTION_DATA_DELAY event, but found:', {
          delayValue,
          delayType: typeof delayValue,
          eventData: callbackEvent.event_data,
          testName,
          timestamp: new Date().toISOString(),
        });
        fail(`Expected positive delay value in EXTRACTION_DATA_DELAY event, but got ${delayValue} (type: ${typeof delayValue})`);
      }

      expect(typeof delayValue).toBe('number');
      expect(delayValue).toBeGreaterThan(0);

      console.log('Rate limiting acceptance test validation successful:', {
        callbackEventType: callbackEvent.event_type,
        delayValue: delayValue,
        testName,
        timestamp: new Date().toISOString(),
      });

    } finally {
      // Step 3: End rate limiting (always execute, even if test fails)
      console.log('Step 3: Ending rate limiting...');
      const endRateLimitingResult = await controlRateLimiting('end');
      
      if (!endRateLimitingResult.success) {
        console.error('Failed to end rate limiting:', {
          error: endRateLimitingResult.error,
          testName,
          timestamp: new Date().toISOString(),
        });
        // Don't fail the test here, just log the error
      } else {
        console.log('Rate limiting ended successfully');
      }
    }
  }, 90000); // 90 second timeout for this comprehensive test
});