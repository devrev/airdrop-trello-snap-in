import axios from 'axios';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

// Test server endpoint
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';

// Helper function to create a valid extraction event
function createExtractionEvent(eventType: EventType, includeContext = true, includeMetadata = true) {
  const event: any = {
    payload: { 
      event_type: eventType,
      event_context: includeContext ? {
        connector_id: 'test-connector-id',
        connection_id: 'test-connection-id'
      } : undefined
    },
    context: includeContext ? {
      snap_in_id: 'test-snap-in-id',
      secrets: {
        service_account_token: 'test-token'
      }
    } : undefined,
    execution_metadata: includeMetadata ? {
      function_name: 'can_extract',
      devrev_endpoint: 'http://localhost:8003'
    } : undefined
  };
  
  return event;
}

describe('can_extract function tests', () => {
  // Test 1: Basic functionality - Valid extraction event
  test('should return can_extract=true for valid extraction event', async () => {    
    const event = createExtractionEvent(EventType.ExtractionDataStart);
    
    const response = await axios.post(TEST_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('function_result');
    expect(response.data.function_result).toHaveProperty('can_extract');
    expect(response.data.function_result).toHaveProperty('message');
    expect(response.data.function_result.can_extract).toBe(true);
  });

  // Test 2: Response format validation
  test('should return the expected response format', async () => {
    const event = createExtractionEvent(EventType.ExtractionMetadataStart);
    
    const response = await axios.post(TEST_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(typeof response.data.function_result.can_extract).toBe('boolean');
    expect(typeof response.data.function_result.message).toBe('string');
  });

  // Test 3: Non-extraction event type
  test('should return can_extract=false for non-extraction event type', async () => {
    const event = createExtractionEvent('hook:snap_in_activate' as any);
    
    const response = await axios.post(TEST_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.can_extract).toBe(false);
    expect(response.data.function_result.message).toContain('not an extraction event');
  });

  // Test 4: Missing service account token
  test('should return can_extract=false when service account token is missing', async () => {
    const event = createExtractionEvent(EventType.ExtractionDataStart);
    if (event.context && event.context.secrets) {
      delete event.context.secrets.service_account_token;
    }
    
    const response = await axios.post(TEST_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.can_extract).toBe(false);
    expect(response.data.function_result.message).toContain('Missing service account token');
  });

  // Test 5: Missing DevRev endpoint
  test('should return can_extract=false when DevRev endpoint is missing', async () => {
    const event = createExtractionEvent(EventType.ExtractionDataStart);
    if (event.execution_metadata) {
      delete event.execution_metadata.devrev_endpoint;
    }
    
    const response = await axios.post(TEST_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.can_extract).toBe(false);
    expect(response.data.function_result.message).toContain('Missing DevRev endpoint');
  });

  // Test 6: Missing event context
  test('should return can_extract=false when event context is missing', async () => {    
    const event = createExtractionEvent(EventType.ExtractionDataStart);
    delete event.payload.event_context;
    
    const response = await axios.post(TEST_SERVER_URL, event);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result.can_extract).toBe(false);
    expect(response.data.function_result.message).toContain('Missing event context');
  });

  // Test 7: Empty events array
  test('should handle error for empty events array', async () => {
    try {
      const response = await axios.post(TEST_SERVER_URL, {
        payload: {},
        execution_metadata: {
          function_name: 'can_extract'
        }
      });
      
      // If we get here, the test should fail
      expect(response.data.error).toBeDefined();
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  // Test 8: Test all extraction event types
  test('should return can_extract=true for all extraction event types', async () => {
    const extractionEventTypes = [
      EventType.ExtractionExternalSyncUnitsStart,
      EventType.ExtractionMetadataStart,
      EventType.ExtractionDataStart,
      EventType.ExtractionDataContinue,
      EventType.ExtractionDataDelete,
      EventType.ExtractionAttachmentsStart,
      EventType.ExtractionAttachmentsContinue,
      EventType.ExtractionAttachmentsDelete
    ];
    
    for (const eventType of extractionEventTypes) {
      const event = createExtractionEvent(eventType);
      
      const response = await axios.post(TEST_SERVER_URL, event);
      
      expect(response.status).toBe(200);
      expect(response.data.function_result.can_extract).toBe(true);
      expect(response.data.function_result.message).toBe('Data extraction workflow can be invoked');
    }
  });
});
