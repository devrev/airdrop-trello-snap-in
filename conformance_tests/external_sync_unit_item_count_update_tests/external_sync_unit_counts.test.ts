import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';
import fs from 'fs';
import path from 'path';

describe('External Sync Unit Counts Test', () => {
  // Read environment variables
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;
  const targetBoardId = '688725dad59c015ce052eecf';
  const expectedItemCount = 150;
  
  // Test data
  const callbackServer = new CallbackServer({ port: 8002 });
  const callbackUrl = 'http://localhost:8002/callback';
  
  beforeAll(async () => {
    // Validate environment variables
    if (!trelloApiKey || !trelloToken || !trelloOrgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }
    
    // Start callback server
    await callbackServer.start();
  });
  
  afterAll(async () => {
    // Stop callback server
    await callbackServer.stop();
  });
  
  test('External sync unit should have correct item count', async () => {
    // Load the event template from the resource file
    const resourcePath = path.resolve(__dirname, './resources/external_sync_unit_counts.json');
    let eventTemplate;
    
    try {
      const fileContent = fs.readFileSync(resourcePath, 'utf8');
      eventTemplate = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading or parsing the resource file:', error);
      throw new Error(`Failed to load event template from ${resourcePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!eventTemplate || !Array.isArray(eventTemplate) || eventTemplate.length === 0) {
      throw new Error('Invalid event template: Expected a non-empty array');
    }
    
    // Get the first event from the template
    const eventData = eventTemplate[0];
    
    // Replace placeholders with actual values
    if (eventData.payload?.connection_data) {
      const connectionData = eventData.payload.connection_data;
      connectionData.key = connectionData.key
        .replace('<TRELLO_API_KEY>', trelloApiKey)
        .replace('<TRELLO_TOKEN>', trelloToken);
      connectionData.org_id = connectionData.org_id
        .replace('<TRELLO_ORGANIZATION_ID>', trelloOrgId);
    } else {
      throw new Error('Invalid event template: Missing payload.connection_data');
    }
    
    // Ensure callback URL is set correctly
    if (eventData.payload?.event_context) {
      eventData.payload.event_context.callback_url = callbackUrl;
    } else {
      throw new Error('Invalid event template: Missing payload.event_context');
    }
    
    console.log('Sending event to Snap-In Server...');
    
    // Send the event to the Snap-In Server
    const response = await snapInClient.post('/handle/sync', eventData);
    
    // Verify the response from the Snap-In Server
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.message).toContain('External sync units extraction completed successfully');
    
    console.log('Waiting for callback event from DevRev...');
    
    // Wait for the callback event from DevRev
    const callbackEvent = await callbackServer.waitForEvent(60000); // 60 second timeout
    
    // Log the received event for debugging
    console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));
    
    // Verify the event type
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    
    // Verify the event data
    expect(callbackEvent.event_data).toBeDefined();
    expect(callbackEvent.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callbackEvent.event_data.external_sync_units)).toBe(true);
    
    // Find the target board in the external sync units
    const targetUnit = callbackEvent.event_data.external_sync_units.find(
      (unit: any) => unit.id === targetBoardId
    );
    
    // Verify the target board exists
    expect(targetUnit).toBeDefined();
    if (!targetUnit) {
      throw new Error(`Board with ID ${targetBoardId} not found in external sync units`);
    }
    
    // Verify the item count
    expect(targetUnit.item_count).toBe(expectedItemCount);
    
    console.log(`Successfully verified item count for board ${targetBoardId}: ${targetUnit.item_count}`);
  });
});