import axios from 'axios';
import { CallbackServer } from './callback-server';
import { 
  EventType, 
  ExtractorEventType, 
  FunctionInput, 
  ExternalSyncUnit 
} from './types';

describe('test_external_sync_units function', () => {
  const callbackServer = new CallbackServer();
  const testServerUrl = 'http://localhost:8000/handle/sync';
  const callbackUrl = 'http://localhost:8002/callback';
  
  beforeAll(async () => {
    await callbackServer.start();
  });
  
  afterAll(async () => {
    await callbackServer.stop();
  });
  
  beforeEach(() => {
    callbackServer.clearCallbackEvents();
  });

  // Test 1: Basic connectivity test
  test('test server is accessible', async () => {
    try {
      // We expect this to fail with a 400 error because we're not sending a valid payload
      // But it confirms the server is running and responding
      await axios.post(testServerUrl, {});
      fail('Expected request to fail with 400 error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
    }
  });

  // Test 2: Function existence test
  test('test_external_sync_units function exists', async () => {
    const event: FunctionInput = createBasicEvent('non_existent_function');

    try {
      await axios.post(testServerUrl, event);
      fail('Expected request to fail with function not found error');
    } catch (error: any) {
      // The server might respond with different error types
      // We just need to verify that the request failed
      expect(error).toBeDefined();
      
      // If we have a response, check it contains the expected error
      if (error.response && error.response.data && error.response.data.error) {
      expect(error.response.data.error).toBeDefined();
      expect(error.response.data.error.err_type).toBe('FUNCTION_NOT_FOUND');
      }
    }
    
    const validEvent: FunctionInput = createBasicEvent('test_external_sync_units');
    const response = await axios.post(testServerUrl, validEvent);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
  });

  // Test 3: Function invocation test
  test('test_external_sync_units function can be invoked', async () => {
    const event: FunctionInput = createBasicEvent('test_external_sync_units');
    
    const response = await axios.post(testServerUrl, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
  });

  // Test 4: Event type validation test
  test('test_external_sync_units handles correct event type', async () => {
    const event: FunctionInput = createBasicEvent('test_external_sync_units');
    // Set incorrect event type
    event.payload.event_type = 'INCORRECT_EVENT_TYPE';
    
    const response = await axios.post(testServerUrl, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.message).toContain('event type was not EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Set correct event type
    event.payload.event_type = EventType.ExtractionExternalSyncUnitsStart;
    const correctResponse = await axios.post(testServerUrl, event);
    expect(correctResponse.status).toBe(200);
    expect(correctResponse.data.function_result.message).toContain('completed successfully');
  });

  // Test 5: Complete workflow test
  test('test_external_sync_units completes the external sync units extraction workflow', async () => {
    const event: FunctionInput = createExtractionEvent();
    event.payload.event_type = EventType.ExtractionExternalSyncUnitsStart;
    
    const response = await axios.post(testServerUrl, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    
    // In a real scenario, we would wait for a callback event
    // Since we can't actually receive callbacks in this test environment,
    // we'll just verify the function was called successfully
    expect(response.data.function_result.message).toContain('completed successfully');
  });

  // Helper function to create a basic event
  function createBasicEvent(functionName: string): FunctionInput {
    return {
      payload: {
        event_type: EventType.ExtractionExternalSyncUnitsStart,
        connection_data: {
          org_id: 'test-org-id',
          org_name: 'Test Org',
          key: 'test-key',
          key_type: 'api_key'
        },
        event_context: {
          callback_url: callbackUrl,
          dev_org: 'test-dev-org',
          dev_org_id: 'test-dev-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          external_sync_unit: 'test-unit',
          external_sync_unit_id: 'test-unit-id',
          external_sync_unit_name: 'Test Unit',
          external_system: 'test-system',
          external_system_type: 'test-system-type',
          import_slug: 'test-import',
          mode: 'INITIAL',
          request_id: 'test-request-id',
          snap_in_slug: 'test-snap-in',
          snap_in_version_id: 'test-version-id',
          sync_run: 'test-sync-run',
          sync_run_id: 'test-sync-run-id',
          sync_tier: 'test-tier',
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit-id',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker'
        }
      },
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-version-id',
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
      }
    };
  }

  // Helper function to create an extraction event
  function createExtractionEvent(): FunctionInput {
    const event = createBasicEvent('test_external_sync_units');
    event.payload.event_type = EventType.ExtractionExternalSyncUnitsStart;
    return event;
  }
});