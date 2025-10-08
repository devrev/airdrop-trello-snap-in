import { getTestEnvironment, createCallbackServerWithCapture, callSnapInFunction } from './test-utils';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Data Acceptance Test', () => {
  let callbackServer: http.Server;
  let env: ReturnType<typeof getTestEnvironment>;
  let capturedEvents: any[] = [];

  beforeAll(async () => {
    env = getTestEnvironment();
    const { server, events } = await createCallbackServerWithCapture();
    callbackServer = server;
    capturedEvents = events;
  });

  afterAll(async () => {
    if (callbackServer) {
      callbackServer.close();
    }
  });

  beforeEach(() => {
    // Clear captured events before each test
    capturedEvents.length = 0;
  });

  test('should extract data and receive EXTRACTION_DATA_DONE callback with attachments', async () => {
    // Load and prepare the test event
    const testEventPath = path.join(__dirname, 'extraction-data-test-event.json');
    
    if (!fs.existsSync(testEventPath)) {
      throw new Error(`Test event file not found at: ${testEventPath}`);
    }

    let testEvent;
    try {
      const testEventContent = fs.readFileSync(testEventPath, 'utf8');
      testEvent = JSON.parse(testEventContent);
    } catch (error) {
      throw new Error(`Failed to parse test event JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Replace placeholders with actual credentials
    const eventStr = JSON.stringify(testEvent)
      .replace(/TRELLO_API_KEY_PLACEHOLDER/g, env.TRELLO_API_KEY)
      .replace(/TRELLO_TOKEN_PLACEHOLDER/g, env.TRELLO_TOKEN)
      .replace(/TRELLO_ORGANIZATION_ID_PLACEHOLDER/g, env.TRELLO_ORGANIZATION_ID);

    const finalEvent = JSON.parse(eventStr);

    console.log('Starting extraction data acceptance test...');
    console.log('Test event prepared with credentials');

    try {
      // Call the extraction function
      const result = await callSnapInFunction('extraction', finalEvent);
      
      console.log('Extraction function called, result:', JSON.stringify(result, null, 2));
      
      // Verify the function executed successfully
      expect(result.function_result).toBeDefined();
      if (!result.function_result.success) {
        expect(result.function_result.success).toBe(true);
        console.error(`Extraction function failed: ${result.function_result.message}`);
        return;
      }
      
      // Wait for callback events (with timeout)
      const maxWaitTime = 90000; // 90 seconds
      const checkInterval = 1000; // 1 second
      let waitTime = 0;
      
      console.log('Waiting for callback events...');
      
      while (waitTime < maxWaitTime) {
        if (capturedEvents.length > 0) {
          console.log(`Received ${capturedEvents.length} callback event(s)`);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
      }

      if (capturedEvents.length === 0) {
        expect(capturedEvents.length).toBeGreaterThan(0);
        return;
      }

      console.log('Captured events:', JSON.stringify(capturedEvents, null, 2));

      // Find the EXTRACTION_DATA_DONE event
      const dataDoneEvents = capturedEvents.filter(event => 
        event.event_type === 'EXTRACTION_DATA_DONE'
      );

      if (dataDoneEvents.length === 0) {
        const eventTypes = capturedEvents.map(e => e.event_type).join(', ');
        expect(dataDoneEvents.length).toBeGreaterThan(0);
        return;
      }

      if (dataDoneEvents.length > 1) {
        expect(dataDoneEvents.length).toBe(1);
        return;
      }

      const dataDoneEvent = dataDoneEvents[0];
      console.log('Found EXTRACTION_DATA_DONE event:', JSON.stringify(dataDoneEvent, null, 2));

      // Validate the artifacts array
      const eventData = dataDoneEvent.event_data;
      if (!eventData) {
        expect(eventData).toBeDefined();
        return;
      }

      const artifactArray = eventData.artifacts;
      if (!Array.isArray(artifactArray)) {
        expect(Array.isArray(artifactArray)).toBe(true);
        return;
      }

      if (artifactArray.length === 0) {
        expect(artifactArray.length).toBeGreaterThan(0);
        return;
      }

      console.log(`Found ${artifactArray.length} artifacts:`, artifactArray.map(a => ({ item_type: a.item_type, item_count: a.item_count })));

      // Find the attachments artifact
      const attachmentsArtifacts = artifactArray.filter(artifact => 
        artifact.item_type === 'attachments'
      );

      if (attachmentsArtifacts.length === 0) {
        const itemTypes = artifactArray.map(a => a.item_type).join(', ');
        expect(attachmentsArtifacts.length).toBeGreaterThan(0);
        return;
      }

      const attachmentsArtifact = attachmentsArtifacts[0];
      console.log('Found attachments artifact:', JSON.stringify(attachmentsArtifact, null, 2));

      // Validate the attachment count
      const itemCount = attachmentsArtifact.item_count;
      if (typeof itemCount !== 'number') {
        expect(typeof itemCount).toBe('number');
        return;
      }

      if (itemCount < 2) {
        expect(itemCount).toBeGreaterThanOrEqual(2);
        return;
      }

      console.log(`✓ Attachments artifact validation passed: item_count = ${itemCount}`);
      console.log('✓ Extraction data acceptance test completed successfully');

    } catch (error) {
      console.error('Extraction data acceptance test failed:', error);
      console.error('Captured events at time of failure:', JSON.stringify(capturedEvents, null, 2));
      throw error;
    }
  }, 110000); // 110 seconds timeout to stay within the 120s limit
});