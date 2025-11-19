import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {
  getTestConfig,
  getTrelloCredentials,
  setupCallbackServer,
  teardownCallbackServer,
  sendEventToSnapIn,
} from './test/main';

describe('External Sync Units Extraction - Rate Limiting', () => {
  let callbackServer: Server;
  let receivedCallbacks: any[];
  const testConfig = getTestConfig();

  beforeEach(async () => {
    // Setup callback server
    const setup = await setupCallbackServer(testConfig.callbackServerPort);
    callbackServer = setup.server;
    receivedCallbacks = setup.receivedCallbacks;
  });

  afterEach(async () => {
    // Teardown callback server
    if (callbackServer) {
      await teardownCallbackServer(callbackServer);
    }
  });

  it('should emit EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR when rate limited', async () => {
    const testName = 'external_sync_units_rate_limiting';
    
    // Step 1: Trigger rate limiting
    console.log('Step 1: Triggering rate limiting...');
    try {
      const rateLimitResponse = await axios.post(
        'http://localhost:8004/start_rate_limiting',
        { test_name: testName },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );
      console.log('Rate limiting triggered successfully');
      console.log('Response:', JSON.stringify(rateLimitResponse.data, null, 2));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Failed to trigger rate limiting:', error.message);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', JSON.stringify(error.response?.data, null, 2));
        throw new Error(
          `Failed to trigger rate limiting at http://localhost:8004/start_rate_limiting. ` +
          `Status: ${error.response?.status}, Message: ${error.message}. ` +
          `This indicates the rate limiting control endpoint is not available or not responding correctly.`
        );
      }
      throw error;
    }

    // Step 2: Load test event from fixture
    console.log('Step 2: Loading test event from fixture...');
    const fixtureContent = fs.readFileSync(
      path.join(__dirname, 'test/fixtures/external-sync-units-rate-limiting-event.json'),
      'utf-8'
    );
    const testEvent = JSON.parse(fixtureContent);

    // Get credentials from environment
    const credentials = getTrelloCredentials();

    // Replace placeholders with actual credentials
    testEvent.payload.connection_data.org_id = credentials.orgId;
    testEvent.payload.connection_data.key = `key=${credentials.apiKey}&token=${credentials.token}`;

    console.log('Sending event to snap-in server...');
    console.log('Event type:', testEvent.payload.event_type);
    console.log('Organization ID:', credentials.orgId);

    // Send event to snap-in server
    const response = await sendEventToSnapIn(testConfig.snapInServerUrl, testEvent);

    console.log('Received response from snap-in server');
    console.log('Response:', JSON.stringify(response, null, 2));

    // Step 3: Wait for callback with timeout
    console.log('Step 3: Waiting for callback...');
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    let callbackReceived = false;

    while (Date.now() - startTime < maxWaitTime) {
      if (receivedCallbacks.length > 0) {
        callbackReceived = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!callbackReceived) {
      throw new Error(
        `Timeout waiting for callback after ${maxWaitTime}ms. No callbacks received. ` +
        `This indicates the snap-in did not emit any event after encountering rate limiting. ` +
        `Expected to receive EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR event.`
      );
    }

    console.log('Callback received');
    console.log('Number of callbacks:', receivedCallbacks.length);

    // Validation 1: Expect exactly one callback
    if (receivedCallbacks.length !== 1) {
      console.error('All received callbacks:', JSON.stringify(receivedCallbacks, null, 2));
      throw new Error(
        `Expected to receive exactly 1 callback, but received ${receivedCallbacks.length}. ` +
        `Received callbacks: ${JSON.stringify(receivedCallbacks, null, 2)}. ` +
        `This indicates the snap-in may have sent multiple events or handled rate limiting incorrectly.`
      );
    }

    const callback = receivedCallbacks[0];
    console.log('Callback payload:', JSON.stringify(callback, null, 2));

    // Validation 2: Verify event_type is EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR
    const eventType = callback.event_type;
    if (eventType !== 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR') {
      console.error('Received callback:', JSON.stringify(callback, null, 2));
      throw new Error(
        `Expected event_type to be 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR', but got '${eventType}'. ` +
        `Received callback: ${JSON.stringify(callback, null, 2)}. ` +
        `This indicates the snap-in did not properly handle rate limiting and emit an error event. ` +
        `The snap-in should detect HTTP 429 status and emit EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR.`
      );
    }

    // Validation 3: Verify event_data exists
    if (!callback.event_data) {
      console.error('Received callback:', JSON.stringify(callback, null, 2));
      throw new Error(
        'Expected callback to contain event_data field, but it was missing. ' +
        `Received callback: ${JSON.stringify(callback, null, 2)}. ` +
        'This indicates the error event structure is incorrect. ' +
        'The event_data field should contain error information.'
      );
    }

    // Validation 4: Verify error field exists in event_data
    if (!callback.event_data.error) {
      console.error('Received event_data:', JSON.stringify(callback.event_data, null, 2));
      throw new Error(
        'Expected event_data to contain error field, but it was missing. ' +
        `Received event_data: ${JSON.stringify(callback.event_data, null, 2)}. ` +
        'This indicates the error event does not contain error information. ' +
        'The event_data.error field should contain details about the rate limiting error.'
      );
    }

    // Validation 5: Verify error has a message
    if (!callback.event_data.error.message) {
      console.error('Received error:', JSON.stringify(callback.event_data.error, null, 2));
      throw new Error(
        'Expected error to contain message field, but it was missing. ' +
        `Received error: ${JSON.stringify(callback.event_data.error, null, 2)}. ` +
        'This indicates the error object does not contain a descriptive message. ' +
        'The error.message field should describe the rate limiting error.'
      );
    }

    console.log('All validations passed successfully');
    console.log('Error message:', callback.event_data.error.message);
    console.log('Successfully verified rate limiting error handling');
  });
});