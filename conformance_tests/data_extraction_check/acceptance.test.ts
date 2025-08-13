import * as fs from 'fs';
import * as path from 'path';
import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';
import { ExtractorEventType } from './utils/types';

describe('Data Extraction Check Acceptance Test', () => {
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

  test('should complete data extraction and emit EXTRACTION_DATA_DONE event', async () => {
    // Load the test event from the resource file
    const eventFilePath = path.resolve(__dirname, './resources/data_extraction_check.json');
    const eventData = JSON.parse(fs.readFileSync(eventFilePath, 'utf8'));
    
    console.log('Sending event to snap-in server:', JSON.stringify(eventData, null, 2));
    
    // Send the event to the snap-in server
    const response = await snapInClient.post('/handle/sync', eventData);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
    
    // Wait for callback events (give some time for processing)
    console.log('Waiting for callback events...');
    
    // Wait for up to 10 seconds for the EXTRACTION_DATA_DONE event
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();
    
    let dataDoneEvent = null;
    
    while (Date.now() - startTime < maxWaitTime) {
      const events = callbackServer.getEvents();
      dataDoneEvent = events.find(e => e.event_type === ExtractorEventType.ExtractionDataDone);
      
      if (dataDoneEvent) {
        break;
      }
      
      // Wait a short time before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Log all received events for debugging
    const allEvents = callbackServer.getEvents();
    console.log(`Received ${allEvents.length} events:`, JSON.stringify(allEvents, null, 2));
    
    // Assert that we received the EXTRACTION_DATA_DONE event
    expect(dataDoneEvent).toBeDefined();
    expect(dataDoneEvent?.event_type).toBe(ExtractorEventType.ExtractionDataDone);
    
    if (!dataDoneEvent) {
      // This provides additional context if the test fails
      const receivedEventTypes = allEvents.map(e => e.event_type).join(', ');
      fail(`Did not receive EXTRACTION_DATA_DONE event. Received events: ${receivedEventTypes}`);
    }
  }, 30000); // Increase timeout to 30 seconds for this test
});