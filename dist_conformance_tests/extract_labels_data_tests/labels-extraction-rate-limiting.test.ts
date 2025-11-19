import { CallbackServer, loadTestPayload, invokeSnapIn, triggerRateLimiting } from './helpers/test-helpers';

describe('Labels Data Extraction - Rate Limiting Handling', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    callbackServer = new CallbackServer(8002);
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('should handle rate limiting and emit EXTRACTION_DATA_DELAY event', async () => {
    const testName = 'labels-extraction-rate-limiting-test';

    console.log(`Starting rate limiting test: ${testName}`);

    // Step 1: Trigger rate limiting on the mock server
    try {
      await triggerRateLimiting(testName);
      console.log('Successfully triggered rate limiting on mock server');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to trigger rate limiting on mock server. ` +
        `Error: ${errorMessage}. ` +
        `Make sure the mock server is running at http://localhost:8004`
      );
    }

    // Step 2: Load test payload with actual credentials
    const payload = loadTestPayload('data_extraction_test.json');
    console.log('Loaded test payload with credentials');

    // Step 3: Invoke the extraction function
    console.log('Invoking extraction function...');
    try {
      await invokeSnapIn(payload);
      console.log('Extraction function invoked successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to invoke snap-in. ` +
        `Error: ${errorMessage}. ` +
        `Make sure the snap-in server is running at http://localhost:8000`
      );
    }

    // Step 4: Wait for the callback event
    console.log('Waiting for EXTRACTION_DATA_DELAY callback event...');
    let callbackEvent;
    try {
      callbackEvent = await callbackServer.waitForEvent('EXTRACTION_DATA_DELAY', 60000);
      console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));
    } catch (error) {
      const receivedEvents = callbackServer.getReceivedEvents();
      const eventTypes = receivedEvents.map(e => e.event_type).join(', ');
      throw new Error(
        `Timeout waiting for EXTRACTION_DATA_DELAY event. ` +
        `Expected event type: EXTRACTION_DATA_DELAY. ` +
        `Received ${receivedEvents.length} event(s): [${eventTypes}]. ` +
        `Full events: ${JSON.stringify(receivedEvents, null, 2)}`
      );
    }

    // Step 5: Validate the event type
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DELAY') {
      throw new Error(
        `Received wrong event type. ` +
        `Expected: EXTRACTION_DATA_DELAY, ` +
        `Actual: ${callbackEvent.event_type}. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DELAY');
    console.log('✓ Event type is correct: EXTRACTION_DATA_DELAY');

    // Step 6: Validate event_data exists
    if (!callbackEvent.event_data) {
      throw new Error(
        `Callback event is missing event_data field. ` +
        `The event must include event_data with a delay field. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }
    expect(callbackEvent.event_data).toBeDefined();
    console.log('✓ event_data field exists');

    // Step 7: Validate delay field exists
    if (callbackEvent.event_data.delay === undefined || callbackEvent.event_data.delay === null) {
      throw new Error(
        `event_data is missing delay field. ` +
        `The delay field must be present and contain a positive integer. ` +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }
    expect(callbackEvent.event_data.delay).toBeDefined();
    console.log('✓ delay field exists');

    // Step 8: Validate delay is a number
    const delay = callbackEvent.event_data.delay;
    if (typeof delay !== 'number') {
      throw new Error(
        `delay field has wrong type. ` +
        `Expected: number, ` +
        `Actual: ${typeof delay}. ` +
        `Value: ${JSON.stringify(delay)}. ` +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }
    expect(typeof delay).toBe('number');
    console.log(`✓ delay is a number: ${delay}`);

    // Step 9: Validate delay is a positive integer
    if (!Number.isInteger(delay) || delay <= 0) {
      throw new Error(
        `delay field has invalid value. ` +
        `Expected: positive integer, ` +
        `Actual: ${delay} (isInteger: ${Number.isInteger(delay)}, isPositive: ${delay > 0}). ` +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }
    expect(Number.isInteger(delay)).toBe(true);
    expect(delay).toBeGreaterThan(0);
    console.log(`✓ delay is a positive integer: ${delay}`);

    // Step 10: Validate only one event was received
    const allEvents = callbackServer.getReceivedEvents();
    if (allEvents.length !== 1) {
      const eventTypes = allEvents.map(e => e.event_type).join(', ');
      throw new Error(
        `Expected exactly 1 callback event, but received ${allEvents.length}. ` +
        `Event types: [${eventTypes}]. ` +
        `The snap-in should emit only one EXTRACTION_DATA_DELAY event when rate limited. ` +
        `Full events: ${JSON.stringify(allEvents, null, 2)}`
      );
    }
    expect(allEvents.length).toBe(1);
    console.log('✓ Exactly one callback event was received');

    console.log(`Successfully validated rate limiting handling with delay: ${delay} seconds`);
  }, 120000);
});