import * as fs from 'fs';
import * as path from 'path';
import { HttpClient, CallbackServer, FunctionResponse } from './utils';

describe('Data Extraction Check Acceptance Test', () => {
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

  test('should process data extraction and emit EXTRACTION_DATA_DONE event', async () => {
    // Load the test event from the resource file
    const eventFilePath = path.resolve(__dirname, 'data_extraction_check.json');
    
    if (!fs.existsSync(eventFilePath)) {
      throw new Error(`Test resource file not found: ${eventFilePath}`);
    }
    
    const eventData = JSON.parse(fs.readFileSync(eventFilePath, 'utf8'));
    console.log('Loaded test event data:', JSON.stringify(eventData, null, 2));
    
    // Send the event to the snap-in server
    console.log('Sending event to snap-in server...');
    const response = await httpClient.post<FunctionResponse>('/handle/sync', eventData);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result?.status).toBe('success');
    console.log('Received response from snap-in server:', JSON.stringify(response.data, null, 2));
    
    // Wait for the worker to process the data and send events to the callback server
    console.log('Waiting for callback events...');
    let attempts = 0;
    const maxAttempts = 10;
    let callbackEvents = [];
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      callbackEvents = callbackServer.getEvents();
      
      if (callbackEvents.length > 0) {
        console.log(`Received ${callbackEvents.length} callback events`);
        break;
      }
      
      attempts++;
      console.log(`Waiting for callback events... (attempt ${attempts}/${maxAttempts})`);
    }
    
    if (callbackEvents.length === 0) {
      throw new Error('No callback events received within the timeout period');
    }
    
    // Log all received events for debugging
    console.log('All callback events received:', JSON.stringify(callbackEvents, null, 2));
    
    // Find the EXTRACTION_DATA_DONE event
    const doneEvent = callbackEvents.find(e => e.event_type === 'EXTRACTION_DATA_DONE');
    
    // Detailed assertion with descriptive error message
    expect(doneEvent).toBeDefined();
    if (!doneEvent) {
      console.error('Expected EXTRACTION_DATA_DONE event not found. Received events:');
      callbackEvents.forEach((event, index) => {
        console.error(`Event ${index + 1}:`, JSON.stringify(event, null, 2));
      });
    } else {
      console.log('Successfully received EXTRACTION_DATA_DONE event:', JSON.stringify(doneEvent, null, 2));
    }
    
    expect(doneEvent?.event_type).toBe('EXTRACTION_DATA_DONE');
  }, 30000); // Set timeout to 30 seconds
});