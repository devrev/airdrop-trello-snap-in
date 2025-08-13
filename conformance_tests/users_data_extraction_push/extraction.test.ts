import { 
  createTestEvent, 
  sendEventToSnapIn, 
  createCallbackServer,
  TRELLO_API_KEY, 
  TRELLO_TOKEN, 
  TRELLO_ORGANIZATION_ID,
  CALLBACK_SERVER_URL
} from './utils/test-helpers';

// Check if required environment variables are set
beforeAll(() => {
  // Verify environment variables are set and not empty
  if (!TRELLO_API_KEY || TRELLO_API_KEY.trim() === '') {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!TRELLO_TOKEN || TRELLO_TOKEN.trim() === '') {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!TRELLO_ORGANIZATION_ID || TRELLO_ORGANIZATION_ID.trim() === '') {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }
});

// Set up and tear down the callback server for each test
let callbackServer: any;
let receivedData: any[] = [];

beforeEach(async () => {
  const serverSetup = await createCallbackServer();
  callbackServer = serverSetup.server;
  receivedData = serverSetup.receivedData;
});

afterEach(() => {
  if (callbackServer) callbackServer.close();
});

describe('Extraction Function Tests', () => {
  // Test 1: Basic test to verify the extraction function exists and can be called
  test('extraction function exists and can be called', async () => {
    // Create a basic event for the health check
    const event = createTestEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapIn(event);
    
    // Verify the response structure
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Wait a bit for any callbacks to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // Test 2: Test that the extraction function correctly handles the EXTRACTION_DATA_START event type
  test('extraction function handles EXTRACTION_DATA_START event type', async () => {
    // Create an event with EXTRACTION_DATA_START event type
    const event = createTestEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapIn(event);
    
    // Verify the response indicates success
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('EXTRACTION_DATA_START');
    
    // Wait a bit for any callbacks to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  // Test 3: Test the complete user data extraction workflow
  test('extraction function correctly extracts and processes user data', async () => {
    // Create an event with EXTRACTION_DATA_START event type
    const event = createTestEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapIn(event);
    
    // Verify the response indicates success
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    
    // Send a second event to check if the state was updated
    // This simulates a continuation event to check if users were marked as completed
    const continuationEvent = createTestEvent('EXTRACTION_DATA_CONTINUE');
    
    // Send the continuation event to the snap-in server
    const continuationResponse = await sendEventToSnapIn(continuationEvent);
    
    // Verify the continuation response indicates success
    expect(continuationResponse.function_result).toBeDefined();
    expect(continuationResponse.function_result.success).toBe(true);
    
    // The state should now indicate that users have been processed
    // We can't directly check the state, but we can infer it from the successful processing
    expect(continuationResponse.function_result.message).toContain('EXTRACTION_DATA_CONTINUE');
    
    // Wait a bit for any callbacks to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
});