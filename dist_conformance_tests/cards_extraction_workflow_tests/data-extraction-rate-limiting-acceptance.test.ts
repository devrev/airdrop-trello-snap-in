import { TestUtils } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

describe('Data Extraction Rate Limiting Acceptance Test', () => {
  let env: ReturnType<typeof TestUtils.getEnvironment>;
  const testIdentifier = 'data-extraction-rate-limiting-test';
  const rateLimitingServerUrl = 'http://localhost:8004';

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
    
    // Cleanup: ensure rate limiting is ended even if test fails
    try {
      await axios.post(`${rateLimitingServerUrl}/end_rate_limiting`, {}, {
        timeout: 5000,
        validateStatus: () => true, // Accept any status code for cleanup
      });
    } catch (error) {
      console.warn('Cleanup: Failed to end rate limiting, but continuing with teardown');
    }
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  /**
   * Creates the test event from the JSON payload file with credential replacement
   */
  function createTestEvent() {
    try {
      // Read the JSON payload file from resources
      const payloadPath = path.join(__dirname, 'data-extraction-test-payload.json');
      const payloadContent = fs.readFileSync(payloadPath, 'utf8');
      
      // Replace placeholders with actual credentials
      const replacedContent = payloadContent
        .replace(/<TRELLO_API_KEY>/g, env.trelloApiKey)
        .replace(/<TRELLO_TOKEN>/g, env.trelloToken)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.trelloOrganizationId);
      
      const event = JSON.parse(replacedContent);
      
      // Validate that the event has the expected structure
      if (!event.payload || !event.context || !event.execution_metadata) {
        throw new Error('Invalid event structure: missing required top-level properties');
      }
      
      if (!event.payload.event_type) {
        throw new Error('Invalid event structure: missing event_type in payload');
      }
      
      if (event.payload.event_type !== 'EXTRACTION_DATA_START') {
        throw new Error(`Invalid event structure: expected event_type 'EXTRACTION_DATA_START', got '${event.payload.event_type}'`);
      }
      
      if (!event.payload.connection_data || !event.payload.connection_data.key) {
        throw new Error('Invalid event structure: missing connection_data.key in payload');
      }
      
      return event;
    } catch (error) {
      throw new Error(`Failed to create test event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Starts rate limiting on the test server
   */
  async function startRateLimiting(): Promise<void> {
    try {
      console.log(`Step 1: Starting rate limiting with test identifier: ${testIdentifier}`);
      
      const response = await axios.post(
        `${rateLimitingServerUrl}/start_rate_limiting`,
        { test_name: testIdentifier },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (response.status !== 200) {
        throw new Error(
          `Rate limiting server returned unexpected status ${response.status}. ` +
          `Response: ${JSON.stringify(response.data, null, 2)}`
        );
      }
      
      console.log('Rate limiting started successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to start rate limiting: ${error.message}. ` +
          `Status: ${error.response?.status}, ` +
          `Response: ${JSON.stringify(error.response?.data, null, 2)}, ` +
          `URL: ${rateLimitingServerUrl}/start_rate_limiting`
        );
      }
      throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ends rate limiting on the test server
   */
  async function endRateLimiting(): Promise<void> {
    try {
      console.log('Step 3: Ending rate limiting');
      
      const response = await axios.post(
        `${rateLimitingServerUrl}/end_rate_limiting`,
        {},
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      
      if (response.status !== 200) {
        throw new Error(
          `Rate limiting server returned unexpected status ${response.status} when ending rate limiting. ` +
          `Response: ${JSON.stringify(response.data, null, 2)}`
        );
      }
      
      console.log('Rate limiting ended successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to end rate limiting: ${error.message}. ` +
          `Status: ${error.response?.status}, ` +
          `Response: ${JSON.stringify(error.response?.data, null, 2)}, ` +
          `URL: ${rateLimitingServerUrl}/end_rate_limiting`
        );
      }
      throw new Error(`Failed to end rate limiting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  describe('Acceptance Test: Rate Limiting Handling', () => {
    it('should handle rate limiting and return EXTRACTION_DATA_DELAY', async () => {
      let rateLimitingStarted = false;
      
      try {
        // Step 1: Start rate limiting
        await startRateLimiting();
        rateLimitingStarted = true;
        
        // Step 2: Send EXTRACTION_DATA_START event and expect EXTRACTION_DATA_DELAY
        const event = createTestEvent();
        
        console.log('Step 2: Sending EXTRACTION_DATA_START event to snap-in server...');
        console.log('Event payload summary:', {
          event_type: event.payload.event_type,
          external_sync_unit_id: event.payload.event_context.external_sync_unit_id,
          external_sync_unit_name: event.payload.event_context.external_sync_unit_name,
          org_id: event.payload.connection_data.org_id,
        });
        
        // Send event to snap-in server
        const response = await TestUtils.sendEventToSnapIn(event);
        
        // Validate that the snap-in accepted the event
        if (response.error) {
          throw new Error(
            `Snap-in server returned error during rate limiting test: ${JSON.stringify(response.error, null, 2)}`
          );
        }
        
        console.log('Event sent successfully, waiting for EXTRACTION_DATA_DELAY callback...');
        
        // Wait for callback from DevRev (extended timeout for rate limiting response)
        let callbacks: any[];
        try {
          callbacks = await TestUtils.waitForCallback(30000); // 30 second timeout
        } catch (error) {
          throw new Error(
            `No callback received from DevRev within timeout during rate limiting test. ` +
            `Expected to receive EXTRACTION_DATA_DELAY callback when rate limiting is active. ` +
            `This indicates the extraction function may not be handling rate limiting correctly. ` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        
        console.log(`Received ${callbacks.length} callback(s) from DevRev:`, 
          callbacks.map(cb => ({ 
            event_type: cb.event_type, 
            has_event_data: !!cb.event_data,
            delay: cb.event_data?.delay 
          })));
        
        // Validate that we received exactly one callback
        if (callbacks.length === 0) {
          throw new Error(
            'Expected to receive exactly one callback from DevRev during rate limiting test, but received none. ' +
            'This indicates the extraction function is not communicating with DevRev properly when rate limited.'
          );
        }
        
        if (callbacks.length !== 1) {
          throw new Error(
            `Expected to receive exactly one callback from DevRev during rate limiting test, but received ${callbacks.length}. ` +
            `All callbacks received: ${JSON.stringify(callbacks.map(cb => ({ 
              event_type: cb.event_type, 
              event_data: cb.event_data 
            })), null, 2)}`
          );
        }
        
        const callback = callbacks[0];
        
        // Validate that the single callback is EXTRACTION_DATA_DELAY
        if (callback.event_type !== 'EXTRACTION_DATA_DELAY') {
          if (callback.event_type === 'EXTRACTION_DATA_ERROR') {
            throw new Error(
              `Expected EXTRACTION_DATA_DELAY callback during rate limiting test but received EXTRACTION_DATA_ERROR instead. ` +
              `This indicates the extraction function may not be handling rate limiting properly. ` +
              `Error details: ${JSON.stringify(callback.event_data, null, 2)}`
            );
          }
          
          if (callback.event_type === 'EXTRACTION_DATA_DONE') {
            throw new Error(
              `Expected EXTRACTION_DATA_DELAY callback during rate limiting test but received EXTRACTION_DATA_DONE instead. ` +
              `This indicates the extraction function may not be detecting rate limiting responses. ` +
              `Callback details: ${JSON.stringify(callback.event_data, null, 2)}`
            );
          }
          
          if (callback.event_type === 'EXTRACTION_DATA_PROGRESS') {
            throw new Error(
              `Expected EXTRACTION_DATA_DELAY callback during rate limiting test but received EXTRACTION_DATA_PROGRESS instead. ` +
              `This indicates the extraction function may have timed out instead of handling rate limiting. ` +
              `Progress callback details: ${JSON.stringify(callback.event_data, null, 2)}`
            );
          }
          
          throw new Error(
            `Expected EXTRACTION_DATA_DELAY callback during rate limiting test but received '${callback.event_type}' instead. ` +
            `Full callback: ${JSON.stringify(callback, null, 2)}`
          );
        }
        
        console.log('Found EXTRACTION_DATA_DELAY callback, validating delay information...');
        
        // Validate the callback has event_data
        if (!callback.event_data) {
          throw new Error(
            `EXTRACTION_DATA_DELAY callback is missing event_data. ` +
            `The callback should include delay information. ` +
            `Full callback: ${JSON.stringify(callback, null, 2)}`
          );
        }
        
        // Validate the delay field exists and is a number
        if (typeof callback.event_data.delay !== 'number') {
          throw new Error(
            `EXTRACTION_DATA_DELAY callback is missing or has invalid delay field. ` +
            `Expected delay to be a number, but got ${typeof callback.event_data.delay}. ` +
            `Event data: ${JSON.stringify(callback.event_data, null, 2)}`
          );
        }
        
        // Validate delay is a positive number
        if (callback.event_data.delay <= 0) {
          throw new Error(
            `EXTRACTION_DATA_DELAY callback has invalid delay value. ` +
            `Expected delay to be a positive number, but got ${callback.event_data.delay}. ` +
            `Event data: ${JSON.stringify(callback.event_data, null, 2)}`
          );
        }
        
        console.log(`✅ Rate limiting test passed: Successfully received EXTRACTION_DATA_DELAY with delay=${callback.event_data.delay} seconds`);
        
        // All validations passed
        expect(callback.event_type).toBe('EXTRACTION_DATA_DELAY');
        expect(callback.event_data).toBeDefined();
        expect(typeof callback.event_data.delay).toBe('number');
        expect(callback.event_data.delay).toBeGreaterThan(0);
        
      } finally {
        // Step 3: Always end rate limiting, even if test fails
        if (rateLimitingStarted) {
          try {
            await endRateLimiting();
          } catch (cleanupError) {
            console.error('Failed to cleanup rate limiting:', cleanupError);
            // Don't throw here as it would mask the original test failure
          }
        }
      }
    }, 90000); // 90 second test timeout to account for rate limiting delays
  });
});