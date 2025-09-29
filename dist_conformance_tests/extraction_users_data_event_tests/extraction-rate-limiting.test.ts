import { 
  getTestEnvironment, 
  setupCallbackServer, 
  closeCallbackServer, 
  sendEventToSnapIn,
  CallbackServerSetup,
  TestEnvironment 
} from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

describe('Extraction Function - Rate Limiting Handling', () => {
  let env: TestEnvironment;
  let callbackServer: CallbackServerSetup;
  const testIdentifier = `rate_limiting_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await closeCallbackServer(callbackServer);
    }
  });

  beforeEach(() => {
    // Clear received callbacks before each test
    callbackServer.receivedCallbacks.length = 0;
  });

  function loadAndPrepareTestEvent(): any {
    try {
      const testDataPath = path.join(__dirname, 'data_extraction_test.json');
      
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`Test data file not found at: ${testDataPath}`);
      }

      const testDataContent = fs.readFileSync(testDataPath, 'utf8');
      const testEvents = JSON.parse(testDataContent);
      
      if (!Array.isArray(testEvents) || testEvents.length === 0) {
        throw new Error('Test data file should contain an array with at least one event');
      }

      const event = testEvents[0];
      
      // Replace credential placeholders with actual values
      const eventStr = JSON.stringify(event)
        .replace(/<TRELLO_API_KEY>/g, env.TRELLO_API_KEY)
        .replace(/<TRELLO_TOKEN>/g, env.TRELLO_TOKEN)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.TRELLO_ORGANIZATION_ID);
      
      return JSON.parse(eventStr);
    } catch (error) {
      throw new Error(`Failed to load and prepare test event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function startRateLimiting(): Promise<void> {
    try {
      const response = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testIdentifier
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status !== 200) {
        throw new Error(`API server responded with status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      console.log(`Rate limiting started for test: ${testIdentifier}`);
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Failed to start rate limiting. API server at http://localhost:8004/start_rate_limiting ` +
          `responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}. ` +
          `Test identifier: ${testIdentifier}`
        );
      } else if (error.request) {
        throw new Error(
          `Failed to start rate limiting. No response received from API server at ` +
          `http://localhost:8004/start_rate_limiting. Make sure the API server is running. ` +
          `Test identifier: ${testIdentifier}`
        );
      } else {
        throw new Error(`Failed to start rate limiting: ${error.message}. Test identifier: ${testIdentifier}`);
      }
    }
  }

  async function endRateLimiting(): Promise<void> {
    try {
      const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status !== 200) {
        throw new Error(`API server responded with status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      console.log(`Rate limiting ended for test: ${testIdentifier}`);
    } catch (error: any) {
      if (error.response) {
        console.error(
          `Failed to end rate limiting. API server at http://localhost:8004/end_rate_limiting ` +
          `responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}. ` +
          `Test identifier: ${testIdentifier}`
        );
      } else if (error.request) {
        console.error(
          `Failed to end rate limiting. No response received from API server at ` +
          `http://localhost:8004/end_rate_limiting. Make sure the API server is running. ` +
          `Test identifier: ${testIdentifier}`
        );
      } else {
        console.error(`Failed to end rate limiting: ${error.message}. Test identifier: ${testIdentifier}`);
      }
    }
  }

  function waitForSingleDelayCallback(timeoutMs: number = 60000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForCallback = () => {
        const elapsedTime = Date.now() - startTime;
        
        // Check if we have exactly one callback
        if (callbackServer.receivedCallbacks.length === 1) {
          const callback = callbackServer.receivedCallbacks[0];
          
          // Verify it's the expected EXTRACTION_DATA_DELAY callback
          if (callback.body && callback.body.event_type === 'EXTRACTION_DATA_DELAY') {
            resolve(callback);
            return;
          } else {
            reject(new Error(
              `Received callback but event_type is not "EXTRACTION_DATA_DELAY". ` +
              `Received event_type: "${callback.body?.event_type}". ` +
              `Full callback: ${JSON.stringify(callback, null, 2)}`
            ));
            return;
          }
        }
        
        // Check if we have more than one callback (should not happen)
        if (callbackServer.receivedCallbacks.length > 1) {
          reject(new Error(
            `Expected exactly 1 callback with event_type "EXTRACTION_DATA_DELAY", ` +
            `but received ${callbackServer.receivedCallbacks.length} callbacks. ` +
            `Callbacks: ${JSON.stringify(callbackServer.receivedCallbacks, null, 2)}`
          ));
          return;
        }
        
        // Check for timeout
        if (elapsedTime >= timeoutMs) {
          reject(new Error(
            `Timeout waiting for EXTRACTION_DATA_DELAY callback after ${timeoutMs}ms. ` +
            `Received ${callbackServer.receivedCallbacks.length} callbacks. ` +
            `Expected exactly 1 callback with event_type "EXTRACTION_DATA_DELAY". ` +
            `Test identifier: ${testIdentifier}. ` +
            `All received callbacks: ${JSON.stringify(callbackServer.receivedCallbacks, null, 2)}`
          ));
          return;
        }
        
        setTimeout(checkForCallback, 1000);
      };
      
      checkForCallback();
    });
  }

  test('should handle rate limiting and emit EXTRACTION_DATA_DELAY event', async () => {
    console.log(`Starting rate limiting test with identifier: ${testIdentifier}`);
    
    try {
      // Step 1: Start rate limiting
      console.log('Step 1: Starting rate limiting...');
      await startRateLimiting();
      
      // Step 2: Send EXTRACTION_DATA_START event and verify callback
      console.log('Step 2: Sending EXTRACTION_DATA_START event...');
      const event = loadAndPrepareTestEvent();
      
      // Ensure the event type is EXTRACTION_DATA_START
      if (event.payload.event_type !== 'EXTRACTION_DATA_START') {
        throw new Error(
          `Test event has incorrect event_type. Expected "EXTRACTION_DATA_START", ` +
          `got "${event.payload.event_type}". Event: ${JSON.stringify(event, null, 2)}`
        );
      }
      
      const response = await sendEventToSnapIn(event);
      
      // Verify the function was invoked successfully
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      if (response.data.error) {
        throw new Error(
          `Snap-in function returned error: ${JSON.stringify(response.data.error, null, 2)}. ` +
          `Test identifier: ${testIdentifier}`
        );
      }
      
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.success).toBe(true);
      
      console.log('Snap-in function invoked successfully, waiting for EXTRACTION_DATA_DELAY callback...');
      
      // Wait for exactly one EXTRACTION_DATA_DELAY callback
      const callback = await waitForSingleDelayCallback(90000); // 90 seconds timeout
      
      console.log('Received EXTRACTION_DATA_DELAY callback:', JSON.stringify(callback, null, 2));
      
      // Verify callback structure
      expect(callback).toBeDefined();
      expect(callback.body).toBeDefined();
      
      const callbackBody = callback.body;
      
      // Verify event_type is EXTRACTION_DATA_DELAY
      expect(callbackBody.event_type).toBe('EXTRACTION_DATA_DELAY');
      
      // Verify event_data exists and contains delay information
      if (!callbackBody.event_data) {
        throw new Error(
          `EXTRACTION_DATA_DELAY callback missing event_data field. ` +
          `Received callback body: ${JSON.stringify(callbackBody, null, 2)}`
        );
      }
      
      // Verify delay field exists and is a number
      if (typeof callbackBody.event_data.delay !== 'number') {
        throw new Error(
          `EXTRACTION_DATA_DELAY callback event_data missing or invalid delay field. ` +
          `Expected number, got: ${typeof callbackBody.event_data.delay}. ` +
          `Event data: ${JSON.stringify(callbackBody.event_data, null, 2)}`
        );
      }
      
      expect(callbackBody.event_data.delay).toBeGreaterThan(0);
      
      console.log(`✅ Successfully received EXTRACTION_DATA_DELAY callback with delay: ${callbackBody.event_data.delay} seconds`);
      
      // Verify we received exactly one callback
      expect(callbackServer.receivedCallbacks.length).toBe(1);
      
    } finally {
      // Step 3: End rate limiting (always execute, even if test fails)
      console.log('Step 3: Ending rate limiting...');
      await endRateLimiting();
    }
    
    console.log('✅ All assertions passed: Rate limiting handled correctly with single EXTRACTION_DATA_DELAY event');
  }, 120000);
});