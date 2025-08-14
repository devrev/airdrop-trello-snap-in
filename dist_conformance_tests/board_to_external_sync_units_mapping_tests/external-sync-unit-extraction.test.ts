import * as fs from 'fs';
import * as path from 'path';
import { snapInClient } from './utils/http-client';
import { CallbackServer, CallbackData } from './utils/callback-server';
import { ExtractorEventType } from './utils/types';

describe('External Sync Unit Extraction Test', () => {
  const callbackServer = new CallbackServer();
  const callbackUrl = 'http://localhost:8002/callback';

  beforeAll(async () => {
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.resetCallback();
  });

  test('extraction function correctly processes external sync units from JSON resource', async () => {
    console.log('Starting external sync unit extraction test');
    
    // Get environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;
    
    if (!apiKey || !token || !orgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }
    
    // Read the JSON resource file
    const resourcePath = path.resolve(__dirname, './resources/trello_external_sync_unit_check.json');
    let eventData: any;
    
    try {
      const fileContent = fs.readFileSync(resourcePath, 'utf8');
      eventData = JSON.parse(fileContent);
      console.log('Successfully loaded resource file');
    } catch (error) {
      console.error('Failed to read or parse resource file:', error);
      throw new Error(`Failed to read or parse resource file: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Replace placeholders with actual credentials
    if (eventData.payload?.connection_data?.key) {
      eventData.payload.connection_data.key = eventData.payload.connection_data.key
        .replace('<TRELLO_API_KEY>', apiKey)
        .replace('<TRELLO_TOKEN>', token);
    } else {
      throw new Error('Invalid resource file structure: missing connection_data.key');
    }
    
    if (eventData.payload?.connection_data?.org_id) {
      eventData.payload.connection_data.org_id = orgId;
    } else {
      throw new Error('Invalid resource file structure: missing connection_data.org_id');
    }
    
    // Update callback URL in the event data
    if (eventData.payload?.event_context) {
      eventData.payload.event_context.callback_url = callbackUrl;
    } else {
      throw new Error('Invalid resource file structure: missing event_context');
    }
    
    console.log('Sending request to snap-in server');
    
    // Send the request to the snap-in server
    try {
      const response = await snapInClient.post('/handle/sync', eventData);
      
      expect(response.status).toBe(200);
      console.log('Received response from snap-in server:', response.status);
    } catch (error) {
      console.error('Failed to send request to snap-in server:', error);
      throw new Error(`Failed to send request to snap-in server: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('Waiting for callback from DevRev...');
    
    // Wait for and verify the callback
    try {
      const callbackData = await callbackServer.waitForCallback(30000); // 30 seconds timeout
      
      console.log('Received callback data:', JSON.stringify(callbackData, null, 2));
      
      // Verify the callback data
      expect(callbackData).toBeDefined();
      expect(callbackData.event_type).toBe(ExtractorEventType.ExtractionExternalSyncUnitsDone);
      
      // Verify external sync units data exists
      expect(callbackData.event_data).toBeDefined();
      expect(callbackData.event_data.external_sync_units).toBeDefined();
      
      // Safely check the external_sync_units array
      const externalSyncUnits = callbackData.event_data.external_sync_units;
      expect(Array.isArray(externalSyncUnits)).toBe(true);
      expect(externalSyncUnits?.length).toBeGreaterThan(0);
      
      // Verify structure of external sync units
      // Only proceed if we have external sync units
      const firstUnit = externalSyncUnits?.[0];
      expect(firstUnit).toHaveProperty('id');
      expect(firstUnit).toHaveProperty('name');
      expect(firstUnit).toHaveProperty('description');
      expect(firstUnit).toHaveProperty('item_type', 'tasks');
      
      console.log('Test completed successfully');
    } catch (error) {
      console.error('Failed during callback verification:', error);
      throw new Error(`Failed during callback verification: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
});