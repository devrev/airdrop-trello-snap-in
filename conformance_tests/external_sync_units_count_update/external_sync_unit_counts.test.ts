import { callSnapInServer, createCallbackServer, TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID } from './utils';
import http from 'http';
import fs from 'fs';
import path from 'path';

describe('External Sync Unit Counts Test', () => {
  let callbackServer: http.Server;
  let getLastCallback: () => any;

  beforeAll(async () => {
    // Start the callback server
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    getLastCallback = serverSetup.getLastCallback;
  });

  afterAll(() => {
    // Close the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  test('should return external sync unit with correct item count', async () => {
    // Load the test event from the resource file
    const resourcePath = path.join(__dirname, 'external_sync_unit_counts.json');
    if (!fs.existsSync(resourcePath)) {
      throw new Error(`Resource file not found: ${resourcePath}`);
    }
    
    const resourceData = JSON.parse(fs.readFileSync(resourcePath, 'utf8'));
    if (!Array.isArray(resourceData) || resourceData.length === 0) {
      throw new Error('Invalid resource data: expected non-empty array');
    }
    
    // Get the first event from the resource
    const eventTemplate = resourceData[0];
    
    // Replace placeholders with actual values
    const connectionData = eventTemplate.payload.connection_data;
    connectionData.key = connectionData.key
      .replace('<TRELLO_API_KEY>', TRELLO_API_KEY)
      .replace('<TRELLO_TOKEN>', TRELLO_TOKEN);
    connectionData.org_id = connectionData.org_id
      .replace('<TRELLO_ORGANIZATION_ID>', TRELLO_ORGANIZATION_ID);
    
    // Call the snap-in server
    const response = await callSnapInServer(eventTemplate);
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated');
    
    // Wait for the callback to be received (may take some time for processing)
    console.log('Waiting for callback response...');
    let callbackData = null;
    const maxAttempts = 30; // 30 attempts with 1-second intervals = 30 seconds max wait
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      callbackData = getLastCallback();
      if (callbackData && callbackData.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Verify we received a callback
    expect(callbackData).toBeDefined();
    if (!callbackData) {
      throw new Error('No callback received within timeout period');
    }
    
    // Verify the callback data
    expect(callbackData.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(callbackData.event_data).toBeDefined();
    expect(callbackData.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callbackData.event_data.external_sync_units)).toBe(true);
    
    // Find the specific external sync unit we're looking for
    const targetBoardId = '688725dad59c015ce052eecf';
    const targetUnit = callbackData.event_data.external_sync_units.find(
      (unit: any) => unit.id === targetBoardId
    );
    
    // Verify the specific external sync unit
    expect(targetUnit).toBeDefined();
    if (!targetUnit) {
      throw new Error(`External sync unit with ID ${targetBoardId} not found in callback data`);
    }
    
    // Log the actual item count for debugging
    console.log(`Found external sync unit with ID ${targetBoardId}, item_count: ${targetUnit.item_count}`);
    
    // Verify the item count
    expect(targetUnit.item_count).toBe(150);
  }, 120000); // 120 seconds timeout as per requirements
});