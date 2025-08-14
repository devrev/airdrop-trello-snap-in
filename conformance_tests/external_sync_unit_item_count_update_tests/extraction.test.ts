import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';

describe('Extraction Function Tests', () => {
  // Read environment variables
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;
  
  // Test data
  const callbackServer = new CallbackServer({ port: 8002 });
  const callbackUrl = 'http://localhost:8002/callback';
  
  beforeAll(async () => {
    // Validate environment variables
    if (!trelloApiKey || !trelloToken || !trelloOrgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }
    
    // Start callback server
    await callbackServer.start();
  });
  
  afterAll(async () => {
    // Stop callback server
    await callbackServer.stop();
  });
  
  test('Extraction function exists and can be called', async () => {
    // Create a basic event to test if the function exists
    const event = createBasicEvent('extraction');
    
    // Call the extraction function
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
  });
  
  test('Extraction function handles EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    // Create an event with EXTRACTION_EXTERNAL_SYNC_UNITS_START event type
    const event = createExtractionEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Call the extraction function
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.message).toContain('External sync units extraction completed successfully');
  });
  
  test('Extraction function retrieves card count for each board', async () => {
    // Create an event with EXTRACTION_EXTERNAL_SYNC_UNITS_START event type
    const event = createExtractionEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Call the extraction function
    await snapInClient.post('/handle/sync', event);
    
    // Wait for the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const callbackEvent = await callbackServer.waitForEvent();
    
    // Verify the event
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(callbackEvent.event_data).toBeDefined();
    expect(callbackEvent.event_data.external_sync_units).toBeDefined();
    
    // Verify that each board has a valid item_count
    const externalSyncUnits = callbackEvent.event_data.external_sync_units;
    expect(externalSyncUnits.length).toBeGreaterThan(0);
    
    // Check each external sync unit
    for (const unit of externalSyncUnits) {
      expect(unit.id).toBeDefined();
      expect(unit.name).toBeDefined();
      expect(unit.item_count).toBeDefined();
      
      // item_count should be a number (either a positive count or -1 if there was an error)
      expect(typeof unit.item_count).toBe('number');
      
      // If item_count is not -1, it should be a non-negative number
      if (unit.item_count !== -1) {
        expect(unit.item_count).toBeGreaterThanOrEqual(0);
      }
    }
  });
  
  // Helper function to create a basic event
  function createBasicEvent(functionName: string) {
    return {
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: functionName,
        event_type: 'test-event-type',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      },
      payload: {
        test: 'test-payload'
      }
    };
  }
  
  // Helper function to create an extraction event
  function createExtractionEvent(eventType: string) {
    return {
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'extraction',
        event_type: 'test-event-type',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      },
      payload: {
        connection_data: {
          org_id: trelloOrgId,
          org_name: 'Test Organization',
          key: `key=${trelloApiKey}&token=${trelloToken}`,
          key_type: 'api_key'
        },
        event_context: {
          callback_url: callbackUrl,
          dev_org: 'test-dev-org',
          dev_org_id: 'test-dev-org-id',
          dev_user: 'test-dev-user',
          dev_user_id: 'test-dev-user-id',
          external_sync_unit: 'test-external-sync-unit',
          external_sync_unit_id: '688725dad59c015ce052eecf',
          external_sync_unit_name: 'Test Board',
          external_system: 'trello',
          external_system_type: 'trello',
          import_slug: 'test-import-slug',
          mode: 'INITIAL',
          request_id: 'test-request-id',
          snap_in_slug: 'test-snap-in-slug',
          snap_in_version_id: 'test-snap-in-version-id',
          sync_run: 'test-sync-run',
          sync_run_id: 'test-sync-run-id',
          sync_tier: 'test-sync-tier',
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit-id',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker'
        },
        event_type: eventType,
        event_data: {}
      }
    };
  }
});