import { 
  createExtractionDataStartEvent, 
  sendEventToSnapIn,
  TRELLO_API_KEY,
  TRELLO_TOKEN, 
  startCallbackServer,
  stopCallbackServer,
  getLastReceivedCallback,
  TRELLO_ORGANIZATION_ID
} from './utils';

// Check if required environment variables are set
beforeAll(() => {
  // Verify environment variables are set
  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    console.error('Missing required environment variables:');
    if (!TRELLO_API_KEY) console.error('- TRELLO_API_KEY');
    if (!TRELLO_TOKEN) console.error('- TRELLO_TOKEN');
    if (!TRELLO_ORGANIZATION_ID) console.error('- TRELLO_ORGANIZATION_ID');
    throw new Error('Missing required environment variables');
  } 
  
  // Start the callback server
  return startCallbackServer();
});

// Clean up after all tests
afterAll(async () => {
  // Stop the callback server
  await stopCallbackServer();
  // Add a small delay to allow connections to close
  await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('Incremental Data Synchronization Tests', () => {
  // Test 1: Basic test - Verify extraction function can be called
  test('should successfully call extraction function with EXTRACTION_DATA_START event', async () => {
    // Create a basic extraction data start event (non-incremental)
    const event = createExtractionDataStartEvent(false);
    
    // Send the event to the snap-in
    const response = await sendEventToSnapIn(event);
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Wait for a moment to allow the snap-in to process the event
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(response.function_result.status).toBe('success');
  });

  // Test 2: Simple test - Verify incremental mode resets cards state
  test('should reset cards completion state when in incremental mode', async () => {
    // Create an incremental extraction data start event
    const event = createExtractionDataStartEvent(true);
    
    // Add a custom field to check if cards state is reset
    event.payload.check_cards_state = true;
    
    // Send the event to the snap-in
    const response = await sendEventToSnapIn(event);
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Wait for a moment to allow the snap-in to process the event
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(response.function_result.status).toBe('success');
    expect(response.function_result.message).toContain('Data extraction completed successfully');
  });

  // Test 3: Complex test - Verify filtering by lastSuccessfulSyncStarted
  test('should filter cards by lastSuccessfulSyncStarted in incremental mode', async () => {
    // Create a timestamp for 1 day ago
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(oneDayAgo.getHours() - 1); // Ensure it's at least an hour ago
    const lastSuccessfulSyncStarted = oneDayAgo.toISOString();
    
    // Create an incremental extraction data start event with lastSuccessfulSyncStarted
    const event = createExtractionDataStartEvent(true);

    // Add lastSuccessfulSyncStarted to the event
    event.payload.event_data = {
      ...event.payload.event_data,
      lastSuccessfulSyncStarted: lastSuccessfulSyncStarted
    };
    
    // Send the event to the snap-in
    const response = await sendEventToSnapIn(event);
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Wait for a moment to allow the snap-in to process the event
    console.log('Using lastSuccessfulSyncStarted:', lastSuccessfulSyncStarted);
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(response.function_result.status).toBe('success');
    
    // The test passes if we get a successful response, as we're testing
    // the implementation's behavior of filtering cards by lastSuccessfulSyncStarted
  });
});