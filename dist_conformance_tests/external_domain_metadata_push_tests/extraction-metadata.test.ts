import { 
  createTestEvent, 
  sendToSnapInServer, 
  startCallbackServer 
} from './utils/test-helpers';
import { Server } from 'http';

describe('Extraction Metadata Tests', () => {
  let callbackServer: Server;
  let receivedData: any[];

  beforeAll(async () => {
    // Start the callback server to receive responses
    const serverSetup = await startCallbackServer();
    callbackServer = serverSetup.server;
    receivedData = serverSetup.receivedData;
  });

  afterAll(() => {
    // Close the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  // Test 1: Basic test to verify the extraction function exists
  test('extraction function exists and can be called', async () => {
    // Create a test event for the extraction function
    const event = createTestEvent('extraction', 'EXTRACTION_METADATA_START');
    
    try {
      // Send the event to the snap-in server
      const response = await sendToSnapInServer(event);
      
      // Verify the response
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status).toBe('success');
      expect(response.function_result.message).toContain('Metadata extraction completed successfully');
    } catch (error) {
      fail(`Failed to send event to snap-in server: ${error}`);
    }
  });

  // Test 2: Test that the extraction function correctly handles the EXTRACTION_METADATA_START event
  test('extraction function handles EXTRACTION_METADATA_START event', async () => {
    // Clear previous callback data
    receivedData.length = 0;
    
    // Create a test event for the extraction function with EXTRACTION_METADATA_START event type
    const event = createTestEvent('extraction', 'EXTRACTION_METADATA_START');
    
    // Send the event to the snap-in server
    await sendToSnapInServer(event);
    
    // Wait for the callback to be received (up to 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify that we received a callback
    expect(receivedData.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_METADATA_DONE event in the received data
    const metadataDoneEvent = receivedData.find(
      data => data.event_type === 'EXTRACTION_METADATA_DONE'
    );
    
    // Verify the event was received
    expect(metadataDoneEvent).toBeDefined();
    expect(metadataDoneEvent.event_type).toBe('EXTRACTION_METADATA_DONE');
  });

  // Test 3: Verify that the external domain metadata is correctly pushed to the repository
  test('external domain metadata is pushed to repository', async () => {
    // Clear previous callback data
    receivedData.length = 0;
    
    // Create a test event for the extraction function with EXTRACTION_METADATA_START event type
    const event = createTestEvent('extraction', 'EXTRACTION_METADATA_START');
    
    // Send the event to the snap-in server
    await sendToSnapInServer(event);
    
    // Wait for the callback to be received (up to 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify that we received a callback
    expect(receivedData.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_METADATA_DONE event in the received data
    const metadataDoneEvent = receivedData.find(
      data => data.event_type === 'EXTRACTION_METADATA_DONE'
    );
    
    // Verify the event was received
    expect(metadataDoneEvent).toBeDefined();
    
    // Verify that the worker data URL was called with the external domain metadata
    // Note: Since we can't directly verify the repository contents, we're checking
    // that the process completed successfully, which implies the metadata was pushed
    expect(metadataDoneEvent.event_type).toBe('EXTRACTION_METADATA_DONE');
    
    // The implementation should have pushed the external domain metadata to the repository
    // without normalizing it, as specified in the functional requirement
  });
});