import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';
import { createDataExtractionStartEvent } from './utils/test-helpers';
import { ExtractorEventType } from './utils/types';

describe('Data Extraction Check Function Tests', () => {
  const callbackServer = new CallbackServer();
  
  beforeAll(async () => {
    await callbackServer.start();
  });
  
  afterAll(async () => {
    await callbackServer.stop();
  });
  
  beforeEach(() => {
    callbackServer.clearEvents();
  });

  // Basic test - verify function can be invoked
  test('should successfully invoke the data_extraction_check function', async () => {
    // Create a basic event for the function
    const event = createDataExtractionStartEvent();
    
    // Send the event to the snap-in server
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
  });

  // Functional test - verify function processes extraction data start event
  test('should process an extraction data start event', async () => {
    // Create an event with the extraction data start event type
    const event = createDataExtractionStartEvent();
    
    // Send the event to the snap-in server
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Data extraction test completed successfully');
  });

  // Comprehensive test - verify function initializes repo, normalizes data, and pushes it
  test('should initialize users repo, normalize data, and push to DevRev', async () => {
    // Create an event with the extraction data start event type
    const event = createDataExtractionStartEvent();
    
    // Send the event to the snap-in server
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for callback events (give some time for processing)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check callback events
    const events = callbackServer.getEvents();
    
    // Verify that we received at least one event
    expect(events.length).toBeGreaterThan(0);
    
    // Find the data done event
    const dataDoneEvent = events.find(e => e.event_type === ExtractorEventType.ExtractionDataDone);
    
    // Verify that the data extraction completed successfully
    expect(dataDoneEvent).toBeDefined();
  });

  // Error handling test
  test('should handle invalid event type gracefully', async () => {
    // Create an event with an invalid event type
    const event = createDataExtractionStartEvent('test-request-id', 'INVALID_EVENT_TYPE');
    
    // Send the event to the snap-in server
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify the response indicates failure but doesn't crash
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Event type is not');
  });
});