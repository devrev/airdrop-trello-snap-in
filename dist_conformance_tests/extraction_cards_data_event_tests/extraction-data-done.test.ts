import { getTestEnvironment, setupCallbackServer, closeServer, sendEventToSnapIn, TestServers } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Function - Data Done Validation', () => {
  let testServers: TestServers;
  let callbackEvents: any[] = [];
  const env = getTestEnvironment();

  beforeAll(async () => {
    // Set up callback server with event capture
    testServers = await setupCallbackServerWithCapture();
  });

  afterAll(async () => {
    if (testServers?.callbackServer) {
      await closeServer(testServers.callbackServer);
    }
  });

  beforeEach(() => {
    // Clear captured events before each test
    callbackEvents = [];
  });

  async function setupCallbackServerWithCapture(): Promise<TestServers> {
    return new Promise((resolve, reject) => {
      const express = require('express');
      const app = express();
      app.use(express.json());

      // Callback endpoint that captures events
      app.post('/callback', (req: any, res: any) => {
        console.log('Received callback event:', JSON.stringify(req.body, null, 2));
        callbackEvents.push(req.body);
        res.status(200).json({ received: true });
      });

      const server = app.listen(8002, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            callbackServer: server,
            callbackUrl: 'http://localhost:8002/callback',
          });
        }
      });
    });
  }

  function loadAndPrepareTestEvent(): any {
    try {
      // Load the test event from JSON file
      const testEventPath = path.join(__dirname, 'data_extraction_test.json');
      const testEventData = fs.readFileSync(testEventPath, 'utf8');
      const testEvents = JSON.parse(testEventData);
      
      if (!Array.isArray(testEvents) || testEvents.length === 0) {
        throw new Error('Invalid test event data: expected non-empty array');
      }

      const event = testEvents[0];

      // Replace credential placeholders with actual values
      if (event.payload?.connection_data?.key) {
        event.payload.connection_data.key = event.payload.connection_data.key
          .replace('<TRELLO_API_KEY>', env.TRELLO_API_KEY)
          .replace('<TRELLO_TOKEN>', env.TRELLO_TOKEN);
      }

      if (event.payload?.connection_data?.org_id) {
        event.payload.connection_data.org_id = event.payload.connection_data.org_id
          .replace('<TRELLO_ORGANIZATION_ID>', env.TRELLO_ORGANIZATION_ID);
      }

      // Update callback URL to point to our test server
      if (event.payload?.event_context?.callback_url) {
        event.payload.event_context.callback_url = testServers.callbackUrl;
      }

      return event;
    } catch (error) {
      throw new Error(`Failed to load or prepare test event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function waitForCallbackEvent(eventType: string, timeoutMs: number = 60000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForEvent = () => {
        // Look for the specific event type in captured events
        const targetEvent = callbackEvents.find(event => 
          event.event_type === eventType || 
          event.payload?.event_type === eventType ||
          event.type === eventType
        );

        if (targetEvent) {
          resolve(targetEvent);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          const receivedEventTypes = callbackEvents.map(event => 
            event.event_type || event.payload?.event_type || event.type || 'unknown'
          );
          reject(new Error(
            `Timeout waiting for callback event '${eventType}'. ` +
            `Received ${callbackEvents.length} events with types: [${receivedEventTypes.join(', ')}]. ` +
            `Full events: ${JSON.stringify(callbackEvents, null, 2)}`
          ));
          return;
        }

        // Continue checking
        setTimeout(checkForEvent, 1000);
      };

      checkForEvent();
    });
  }

  test('should receive EXTRACTION_DATA_DONE event with cards artifact having item_count=150', async () => {
    // Load and prepare the test event
    const event = loadAndPrepareTestEvent();
    
    console.log('Sending extraction event to snap-in server...');
    
    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);
    
    console.log('Snap-in server response:', JSON.stringify(response, null, 2));

    // Verify the function was invoked successfully
    expect(response).toBeDefined();
    
    if (response.error) {
      console.error('Snap-in server returned error:', JSON.stringify(response.error, null, 2));
      throw new Error(`Snap-in server error: ${JSON.stringify(response.error)}`);
    }

    // Wait for the EXTRACTION_DATA_DONE callback event
    console.log('Waiting for EXTRACTION_DATA_DONE callback event...');
    
    const callbackEvent = await waitForCallbackEvent('EXTRACTION_DATA_DONE', 90000);
    
    console.log('Received EXTRACTION_DATA_DONE event:', JSON.stringify(callbackEvent, null, 2));

    // Validate the callback event structure
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type || callbackEvent.payload?.event_type || callbackEvent.type).toBe('EXTRACTION_DATA_DONE');

    // Extract artifacts array from the event
    let artifactArray: any[] | undefined;
    
    // Try different possible paths for the artifacts array
    if (callbackEvent.event_data?.artifacts) {
      artifactArray = callbackEvent.event_data.artifacts;
    } else if (callbackEvent.payload?.event_data?.artifacts) {
      artifactArray = callbackEvent.payload.event_data.artifacts;
    } else if (callbackEvent.data?.artifacts) {
      artifactArray = callbackEvent.data.artifacts;
    } else if (callbackEvent.artifacts) {
      artifactArray = callbackEvent.artifacts;
    }

    // Validate artifacts array exists and is not empty
    if (!artifactArray) {
      throw new Error(
        `Missing artifacts array in callback event. Event structure: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    if (!Array.isArray(artifactArray)) {
      throw new Error(
        `Artifacts is not an array. Type: ${typeof artifactArray}, Value: ${JSON.stringify(artifactArray)}`
      );
    }

    if (artifactArray.length === 0) {
      throw new Error('Artifacts array is empty. Expected at least one artifact.');
    }

    console.log(`Found ${artifactArray.length} artifacts:`, JSON.stringify(artifactArray, null, 2));

    // Find the cards artifact
    const cardsArtifact = artifactArray.find(artifact => 
      artifact.item_type === 'cards' || 
      artifact.itemType === 'cards' ||
      artifact.type === 'cards'
    );

    if (!cardsArtifact) {
      const availableItemTypes = artifactArray.map(artifact => 
        artifact.item_type || artifact.itemType || artifact.type || 'unknown'
      );
      throw new Error(
        `No cards artifact found. Available item types: [${availableItemTypes.join(', ')}]. ` +
        `Full artifacts: ${JSON.stringify(artifactArray, null, 2)}`
      );
    }

    console.log('Found cards artifact:', JSON.stringify(cardsArtifact, null, 2));

    // Validate the cards artifact has the expected item_count
    const itemCount = cardsArtifact.item_count || cardsArtifact.itemCount || cardsArtifact.count;
    
    if (itemCount === undefined || itemCount === null) {
      throw new Error(
        `Cards artifact missing item_count field. Artifact structure: ${JSON.stringify(cardsArtifact, null, 2)}`
      );
    }

    if (typeof itemCount !== 'number') {
      throw new Error(
        `Cards artifact item_count is not a number. Type: ${typeof itemCount}, Value: ${itemCount}`
      );
    }

    if (itemCount < 150) {
      throw new Error(
        `Cards artifact item_count is ${itemCount}, expected 150. This indicates that not all cards data was extracted.`
      );
    }

    // Verify the exact expected count
    expect(itemCount).toBe(150);
    
    console.log(`✓ Successfully validated cards artifact with item_count=${itemCount}`);
  }, 120000);
});