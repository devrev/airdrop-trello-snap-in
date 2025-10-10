import { getTestEnvironment, setupCallbackServer, closeServer, sendEventToSnapIn, TestServers } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

describe('Extraction Function - Rate Limiting Handling', () => {
  let testServers: TestServers;
  let callbackEvents: any[] = [];
  const env = getTestEnvironment();
  const testIdentifier = 'extraction-rate-limiting-test';
  const rateLimitingApiUrl = 'http://localhost:8004';

  beforeAll(async () => {
    // Set up callback server with event capture
    testServers = await setupCallbackServerWithCapture();
  });

  afterAll(async () => {
    // Always try to end rate limiting in case test fails
    try {
      await endRateLimiting();
    } catch (error) {
      console.warn('Failed to end rate limiting in cleanup:', error);
    }

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

  async function startRateLimiting(): Promise<void> {
    try {
      console.log(`Starting rate limiting for test: ${testIdentifier}`);
      const response = await axios.post(`${rateLimitingApiUrl}/start_rate_limiting`, {
        test_name: testIdentifier
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Rate limiting API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      console.log('Rate limiting started successfully:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to start rate limiting - API error: ${error.response.status} - ${JSON.stringify(error.response.data)}. ` +
          `Make sure the rate limiting API server is running on port 8004.`
        );
      } else if (error.request) {
        throw new Error(
          `Failed to start rate limiting - No response from API server. ` +
          `Make sure the rate limiting API server is running on ${rateLimitingApiUrl}.`
        );
      } else {
        throw new Error(`Failed to start rate limiting - Request setup error: ${error.message}`);
      }
    }
  }

  async function endRateLimiting(): Promise<void> {
    try {
      console.log('Ending rate limiting');
      const response = await axios.post(`${rateLimitingApiUrl}/end_rate_limiting`, {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Rate limiting API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      console.log('Rate limiting ended successfully:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to end rate limiting - API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        throw new Error(
          `Failed to end rate limiting - No response from API server. ` +
          `Make sure the rate limiting API server is running on ${rateLimitingApiUrl}.`
        );
      } else {
        throw new Error(`Failed to end rate limiting - Request setup error: ${error.message}`);
      }
    }
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

      // Verify this is an EXTRACTION_DATA_START event
      if (event.payload?.event_type !== 'EXTRACTION_DATA_START') {
        throw new Error(
          `Expected EXTRACTION_DATA_START event, but got: ${event.payload?.event_type}. ` +
          `The rate limiting test requires an EXTRACTION_DATA_START event.`
        );
      }

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
            `Timeout waiting for callback event '${eventType}' after ${timeoutMs}ms. ` +
            `This indicates that the extraction function did not properly handle rate limiting. ` +
            `Expected: The function should detect rate limiting (HTTP 429) and emit EXTRACTION_DATA_DELAY. ` +
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

  test('should handle rate limiting by emitting EXTRACTION_DATA_DELAY event', async () => {
    let rateLimitingStarted = false;

    try {
      // Step 1: Start rate limiting
      console.log('=== Step 1: Starting rate limiting ===');
      await startRateLimiting();
      rateLimitingStarted = true;

      // Step 2: Load and prepare the test event
      console.log('=== Step 2: Preparing and sending extraction event ===');
      const event = loadAndPrepareTestEvent();
      
      console.log('Sending EXTRACTION_DATA_START event to snap-in server during rate limiting...');
      
      // Send event to snap-in server
      const response = await sendEventToSnapIn(event);
      
      console.log('Snap-in server response:', JSON.stringify(response, null, 2));

      // Verify the function was invoked successfully (even if it encounters rate limiting)
      expect(response).toBeDefined();
      
      if (response.error) {
        console.error('Snap-in server returned error:', JSON.stringify(response.error, null, 2));
        throw new Error(
          `Snap-in server error during rate limiting test: ${JSON.stringify(response.error)}. ` +
          `The function should handle rate limiting gracefully and not crash.`
        );
      }

      // Wait for the EXTRACTION_DATA_DELAY callback event
      console.log('Waiting for EXTRACTION_DATA_DELAY callback event...');
      
      const callbackEvent = await waitForCallbackEvent('EXTRACTION_DATA_DELAY', 90000);
      
      console.log('Received EXTRACTION_DATA_DELAY event:', JSON.stringify(callbackEvent, null, 2));

      // Validate the callback event structure
      expect(callbackEvent).toBeDefined();
      
      const eventType = callbackEvent.event_type || callbackEvent.payload?.event_type || callbackEvent.type;
      if (eventType !== 'EXTRACTION_DATA_DELAY') {
        throw new Error(
          `Expected callback event type 'EXTRACTION_DATA_DELAY', but received '${eventType}'. ` +
          `This indicates the extraction function did not properly handle rate limiting. ` +
          `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
        );
      }

      // Validate that the event contains delay information
      let delayValue: any;
      if (callbackEvent.event_data?.delay !== undefined) {
        delayValue = callbackEvent.event_data.delay;
      } else if (callbackEvent.payload?.event_data?.delay !== undefined) {
        delayValue = callbackEvent.payload.event_data.delay;
      } else if (callbackEvent.data?.delay !== undefined) {
        delayValue = callbackEvent.data.delay;
      } else if (callbackEvent.delay !== undefined) {
        delayValue = callbackEvent.delay;
      }

      if (delayValue === undefined || delayValue === null) {
        throw new Error(
          `EXTRACTION_DATA_DELAY event is missing delay value. ` +
          `The event should include a delay field indicating how long to wait before retrying. ` +
          `Event structure: ${JSON.stringify(callbackEvent, null, 2)}`
        );
      }

      if (typeof delayValue !== 'number' || delayValue <= 0) {
        throw new Error(
          `EXTRACTION_DATA_DELAY event has invalid delay value: ${delayValue} (type: ${typeof delayValue}). ` +
          `Expected a positive number representing delay in seconds. ` +
          `Event structure: ${JSON.stringify(callbackEvent, null, 2)}`
        );
      }

      // Verify we received exactly one callback event (no duplicates or other events)
      if (callbackEvents.length !== 1) {
        const eventTypes = callbackEvents.map(event => 
          event.event_type || event.payload?.event_type || event.type || 'unknown'
        );
        throw new Error(
          `Expected exactly 1 callback event (EXTRACTION_DATA_DELAY), but received ${callbackEvents.length} events. ` +
          `Event types: [${eventTypes.join(', ')}]. ` +
          `This indicates the extraction function may have emitted multiple events or wrong event types. ` +
          `All events: ${JSON.stringify(callbackEvents, null, 2)}`
        );
      }

      console.log(`✓ Successfully validated EXTRACTION_DATA_DELAY event with delay=${delayValue} seconds`);

      // Step 3: End rate limiting
      console.log('=== Step 3: Ending rate limiting ===');
      await endRateLimiting();
      rateLimitingStarted = false;

      console.log('✓ Rate limiting test completed successfully');

    } catch (error) {
      // Ensure rate limiting is ended even if test fails
      if (rateLimitingStarted) {
        try {
          console.log('Cleaning up: ending rate limiting due to test failure');
          await endRateLimiting();
        } catch (cleanupError) {
          console.error('Failed to end rate limiting during cleanup:', cleanupError);
        }
      }
      
      // Re-throw the original error with additional context
      if (error instanceof Error) {
        throw new Error(
          `Rate limiting test failed: ${error.message}. ` +
          `Test steps: 1) Start rate limiting, 2) Send EXTRACTION_DATA_START event, 3) Wait for EXTRACTION_DATA_DELAY, 4) End rate limiting.`
        );
      } else {
        throw error;
      }
    }
  }, 120000);
});