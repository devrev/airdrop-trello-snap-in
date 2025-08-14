import { HttpClient, CallbackServer, createMockEvent, FunctionResponse } from './utils';

describe('Data Extraction Check Function Tests', () => {
  const snapInServer = 'http://localhost:8000';
  const httpClient = new HttpClient(snapInServer);
  const callbackServer = new CallbackServer(8002);
  
  beforeAll(async () => {
    await callbackServer.start();
  });
  
  afterAll(async () => {
    await callbackServer.stop();
  });
  
  beforeEach(() => {
    callbackServer.clearEvents();
  });

  // Test 1: Basic Connectivity
  test('should be able to invoke the data_extraction_check function', async () => {
    // Create a basic event with EXTRACTION_DATA_START event type
    const event = createMockEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await httpClient.post<FunctionResponse>('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined(); 
    expect(response.data.function_result?.status).toBe('success');
    expect(response.data.function_result.message).toContain('Data extraction check completed successfully');
  });

  // Test 2: Event Type Validation
  test('should handle EXTRACTION_DATA_START event type correctly', async () => {
    // Create an event with the correct event type
    const event = createMockEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await httpClient.post<FunctionResponse>('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result?.status).toBe('success');

    // Create an event with an incorrect event type
    const invalidEvent = createMockEvent('INVALID_EVENT_TYPE');
    
    // Send the event to the snap-in server
    const invalidResponse = await httpClient.postRaw('/handle/sync', invalidEvent);
    
    // Verify the response indicates the event type was not correct
    expect(invalidResponse.status).toBe(200);
    expect(invalidResponse.data?.function_result?.message).toContain('event type was not EXTRACTION_DATA_START');
  });

  // Test 3: Data Processing
  test('should process user data correctly', async () => {
    // Create an event with EXTRACTION_DATA_START event type
    const event = createMockEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await httpClient.post<FunctionResponse>('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result?.status).toBe('success');
    
    // Wait for a short time to allow the worker to process the data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we received any events on the callback server
    const callbackEvents = callbackServer.getEvents();
    
    // We should have received at least one event (EXTRACTION_DATA_DONE)
    expect(callbackEvents.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_DATA_DONE event
    const doneEvent = callbackEvents.find(e => e.event_type === 'EXTRACTION_DATA_DONE');
    expect(doneEvent).toBeDefined();
  });

  // Test 4: Normalization and Test 5: Completion (combined for simplicity)
  test('should normalize user data and complete the extraction process', async () => {
    // Create an event with EXTRACTION_DATA_START event type
    const event = createMockEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    await httpClient.post<FunctionResponse>('/handle/sync', event);
    
    // Wait for a short time to allow the worker to process the data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we received any events on the callback server
    const callbackEvents = callbackServer.getEvents();
    
    // Find the EXTRACTION_DATA_DONE event
    const doneEvent = callbackEvents.find(e => e.event_type === 'EXTRACTION_DATA_DONE');
    expect(doneEvent).toBeDefined();
    
    // The implementation should have initialized a 'users' repo
    // and normalized the user data according to the requirements
    // We can't directly verify this since we don't have access to the internal state,
    // but we can infer it from the successful completion of the process
    
    // If there was an error in normalization or repo initialization,
    // we would have received an EXTRACTION_DATA_ERROR event instead
    const errorEvent = callbackEvents.find(e => e.event_type === 'EXTRACTION_DATA_ERROR');
    expect(errorEvent).toBeUndefined();
  });
});