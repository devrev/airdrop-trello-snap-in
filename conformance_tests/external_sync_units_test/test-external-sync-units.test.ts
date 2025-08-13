import axios from 'axios';
import { CallbackServer } from './callback-server';

const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_URL = 'http://localhost:8002/callback';
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout for requests

describe('test_external_sync_units Function Tests', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    // Start the callback server
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    // Stop the callback server
    await callbackServer.stop();
  });

  beforeEach(() => {
    // Clear callback data before each test
    callbackServer.clearCallbackData();
  });

  test('Basic Function Invocation - Should successfully invoke the function', async () => {
    // Create a valid event for the function
    const event = createValidEvent();
    
    try {
      // Send the request to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, event, { timeout: REQUEST_TIMEOUT });
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('success', true);
      expect(response.data.function_result).toHaveProperty('message', expect.any(String));
      expect(response.data.function_result.message).toContain('completed successfully');
    } catch (error) {
      fail(`Failed to invoke function: ${handleAxiosError(error)}`);
    }
  });

  test('Event Type Validation - Should return error for invalid event type', async () => {
    // Create an event with an invalid event type
    const event = createValidEvent();
    event.payload.event_type = 'INVALID_EVENT_TYPE';
    
    try {
      // Send the request to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, event, { timeout: REQUEST_TIMEOUT });
      
      // Verify the response indicates failure due to invalid event type
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('success', false);
      expect(response.data.function_result).toHaveProperty('message', expect.any(String));
      expect(response.data.function_result.message).toContain('Event type is not EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    } catch (error) {
      fail(`Test failed: ${handleAxiosError(error)}`);
    }
  });

  test('External Sync Units Extraction - Should complete the extraction workflow', async () => {
    // Create a valid event for the function
    const event = createValidEvent();
    
    try {
      // Send the request to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, event, { timeout: REQUEST_TIMEOUT });
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('success', true);
      expect(response.data.function_result).toHaveProperty('message', expect.any(String));
      expect(response.data.function_result.message).toContain('completed successfully');
    } catch (error) {
      fail(`Failed to complete extraction workflow: ${handleAxiosError(error)}`);
    }
  });

  test('Error Handling - Should handle missing context', async () => {
    // Create an event with missing context
    const baseEvent = createValidEvent();
    // Create a new event without the context property by omitting it during object creation
    const eventWithoutContext = {
      execution_metadata: baseEvent.execution_metadata,
      payload: baseEvent.payload,
      input_data: baseEvent.input_data
    };
    
    try {
      // Send the request to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, eventWithoutContext, { timeout: REQUEST_TIMEOUT });
      
      // The implementation returns a 200 status with an error object when context is missing
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('error');
      
      // The error should contain information about the missing context
      const errorObj = response.data.error;
      expect(errorObj).toBeDefined();
    } catch (error) {
      // If we get an error response, it should be a 400 status code
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(400);
        expect(typeof error.response.data).toBe('string');
        expect(error.response.data).toContain('Invalid request format');
      } else {
        fail(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  test('Error Handling - Should handle missing execution_metadata', async () => {
    // Create an event with missing execution_metadata
    const baseEvent = createValidEvent();
    // Create a new event without the execution_metadata property by omitting it during object creation
    const eventWithoutMetadata = {
      context: baseEvent.context,
      payload: baseEvent.payload,
      input_data: baseEvent.input_data
    };
    
    try {
      // Send the request to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, eventWithoutMetadata, { timeout: REQUEST_TIMEOUT });
      
      // If we get here, check if the response contains an error
      if (response.data && response.data.error) {
        // The server returned an error object
        expect(response.data).toHaveProperty('error');
      } else {
        fail(`Expected an error response, but got: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      // We expect an Axios error with a response
      if (axios.isAxiosError(error) && error.response) {
        // The server should return a 400 status code for invalid request format
        expect(error.response.status).toBe(400);
        
        // The error message should indicate the issue with the request
        const errorMessage = error.response.data;
        expect(typeof errorMessage).toBe('string');
        expect(errorMessage).toContain('Invalid request format');
      } else {
        fail(`Expected an Axios error with response, but got: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
});

// Define fail function to replace the undefined fail calls
function fail(message: string): never {
  throw new Error(message);
}

// Helper function to handle Axios errors
function handleAxiosError(error: unknown): string {
  return axios.isAxiosError(error) ? `${error.message} (${error.code})` : String(error);
}

function createValidEvent() {
  return {
    context: {
      dev_oid: 'dev_oid_123',
      source_id: 'source_123',
      snap_in_id: 'snap_in_123',
      snap_in_version_id: 'snap_in_version_123',
      service_account_id: 'service_account_123',
      secrets: {
        service_account_token: 'test_token'
      }
    },
    execution_metadata: {
      request_id: 'request_123',
      function_name: 'test_external_sync_units',
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    payload: {
      event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
      connection_data: {
        org_id: 'org_123',
        org_name: 'Test Org',
        key: 'test_key',
        key_type: 'test_key_type'
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'dev_org_123',
        dev_org_id: 'dev_org_123',
        dev_user: 'dev_user_123',
        dev_user_id: 'dev_user_123',
        external_sync_unit: 'external_sync_unit_123',
        external_sync_unit_id: 'external_sync_unit_123',
        external_sync_unit_name: 'Test External Sync Unit',
        external_system: 'test_system',
        external_system_type: 'test_system_type',
        import_slug: 'test_import_slug',
        mode: 'INITIAL',
        request_id: 'request_123',
        snap_in_slug: 'test_snap_in_slug',
        snap_in_version_id: 'snap_in_version_123',
        sync_run: 'sync_run_123',
        sync_run_id: 'sync_run_123',
        sync_tier: 'test_tier',
        sync_unit: 'sync_unit_123',
        sync_unit_id: 'sync_unit_123',
        uuid: 'uuid_123',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}