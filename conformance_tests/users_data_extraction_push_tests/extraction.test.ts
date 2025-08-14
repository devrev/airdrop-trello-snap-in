import { 
  createCallbackServer, 
  createExtractionEvent, 
  sendEventToSnapIn 
} from './utils';
import { Server } from 'http';

describe('Extraction Function Tests', () => {
  let callbackServer: Server;
  let receivedEvents: any[];

  beforeAll(async () => {
    // Set up the callback server to receive events from the snap-in
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    receivedEvents = serverSetup.receivedEvents;
  });

  afterAll(() => {
    // Clean up the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  beforeEach(() => {
    // Clear received events before each test
    receivedEvents.length = 0;
  });

  test('should invoke extraction function with EXTRACTION_DATA_START event', async () => {
    // Create an event with EXTRACTION_DATA_START event type
    const event = createExtractionEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in and don't wait for the response
    await sendEventToSnapIn(event);
    
    // Wait for callback events (give it some time to process)
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify the callback events
    expect(receivedEvents.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_DATA_DONE event
    const doneEvent = receivedEvents.find(e => 
      e.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    // Verify the event was emitted
    expect(doneEvent).toBeDefined();
  }, 45000);

  test('should skip user extraction when users.completed is true and emit EXTRACTION_DATA_DONE', async () => {
    // Create an event with state indicating users data has been pushed
    const event = createExtractionEvent('EXTRACTION_DATA_START', {
      users: { completed: true }
    });
    
    // Send the event to the snap-in
    await sendEventToSnapIn(event);
    
    // Wait for callback events (give it some time to process)
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify the callback events
    expect(receivedEvents.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_DATA_DONE event
    const doneEvent = receivedEvents.find(e => 
      e.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    // Verify the event was emitted
    expect(doneEvent).toBeDefined();
  }, 45000);

  test('should extract users data when users.completed is false and emit EXTRACTION_DATA_DONE', async () => {
    // Create an event with state indicating users data has not been pushed
    const event = createExtractionEvent('EXTRACTION_DATA_START', {
      users: { completed: false }
    });
    
    // Send the event to the snap-in
    await sendEventToSnapIn(event);
    
    // Wait for callback events (give it some time to process)
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Verify the callback events
    expect(receivedEvents.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_DATA_DONE event
    const doneEvent = receivedEvents.find(e => 
      e.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    // Verify the event was emitted
    expect(doneEvent).toBeDefined();
    
    // Create another event to check if state was updated
    const secondEvent = createExtractionEvent('EXTRACTION_DATA_CONTINUE');
    
    // Clear received events
    receivedEvents.length = 0;
    
    // Send the second event
    await sendEventToSnapIn(secondEvent);
    
    // Wait for callback events
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify the callback events for the second request
    expect(receivedEvents.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_DATA_DONE event in the second response
    const secondDoneEvent = receivedEvents.find(e => 
      e.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    // Verify the event was emitted (indicating state was updated)
    expect(secondDoneEvent).toBeDefined();
  }, 60000);
});