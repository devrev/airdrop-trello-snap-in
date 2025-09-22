import { HttpClient, SnapInEvent } from './utils/http-client';
import { CallbackServer } from './utils/server';
import { getConfig } from './utils/config';
import fs from 'fs';
import path from 'path';

describe('Metadata Extraction Tests', () => {
  let callbackServer: CallbackServer;
  let httpClient: HttpClient;
  const config = getConfig();
  
  beforeAll(async () => {
    callbackServer = new CallbackServer();
    await callbackServer.start();
    httpClient = new HttpClient(config.snapInServerUrl);
  });
  
  afterAll(async () => {
    await callbackServer.stop();
  });
  
  beforeEach(() => {
    callbackServer.clearEvents();
  });
  
  it('should successfully invoke the extraction function', async () => {
    // Load the event template
    const eventTemplate = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'events/metadata-extraction.json'), 'utf-8')
    ) as SnapInEvent;
    
    // Replace placeholders with actual values
    eventTemplate.payload.connection_data.key = eventTemplate.payload.connection_data.key
      .replace('TRELLO_API_KEY', config.trelloApiKey)
      .replace('TRELLO_TOKEN', config.trelloToken);
    eventTemplate.payload.connection_data.org_id = config.trelloOrganizationId;
    
    // Send the event to the Snap-In server
    const response = await httpClient.sendEvent(eventTemplate);
    
    // Verify the response
    expect(response).toBeDefined();
    // The response from the function is the function_result property
    expect(response.function_result).toBeDefined();
    expect(response.function_result.message).toContain('initiated successfully');
  });
  
  it('should correctly process metadata extraction and emit EXTRACTION_METADATA_DONE', async () => {
    // Load the event template
    const eventTemplate = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'events/metadata-extraction.json'), 'utf-8')
    ) as SnapInEvent;
    
    // Replace placeholders with actual values
    eventTemplate.payload.connection_data.key = eventTemplate.payload.connection_data.key
      .replace('TRELLO_API_KEY', config.trelloApiKey)
      .replace('TRELLO_TOKEN', config.trelloToken);
    eventTemplate.payload.connection_data.org_id = config.trelloOrganizationId;
    
    // Send the event to the Snap-In server
    await httpClient.sendEvent(eventTemplate);
    
    // Wait for the callback event
    const callbackEvent = await callbackServer.waitForEvent('EXTRACTION_METADATA_DONE');
    
    // Verify the callback event
    expect(callbackEvent).not.toBeNull();
    expect(callbackEvent?.event_type).toBe('EXTRACTION_METADATA_DONE');
  });
});