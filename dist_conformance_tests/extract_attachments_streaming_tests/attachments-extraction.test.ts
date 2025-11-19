import { CallbackServer, invokeSnapIn, loadTestPayload, verifyArtifactUpload, triggerRateLimiting } from './test-helpers';

describe('Attachment Streaming Tests', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    callbackServer = new CallbackServer();
    await callbackServer.start(8002);
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('attachmentTestFlow', async () => {
    // Step 1: Extract data (including attachment metadata)
    const dataPayload = loadTestPayload('data_extraction_test.json');
    await invokeSnapIn(dataPayload);

    // Wait for EXTRACTION_DATA_DONE callback
    const dataEvent = await callbackServer.waitForEvent(120000);
    expect(dataEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify only one event was received in Step 1
    const dataEvents = callbackServer.getReceivedEvents();
    expect(dataEvents.length).toBe(1);
    expect(dataEvents[0].event_type).toBe('EXTRACTION_DATA_DONE');

    // Clear events before attachment streaming
    callbackServer.clearEvents();

    // Step 2: Stream attachments
    const attachmentsPayload = loadTestPayload('attachments_extraction_test.json');
    await invokeSnapIn(attachmentsPayload);

    // Wait for callback event
    const event = await callbackServer.waitForEvent(120000);

    // Validate that exactly one callback event was received
    const receivedEvents = callbackServer.getReceivedEvents();
    expect(receivedEvents.length).toBe(1);
    
    // Validate event type
    expect(event.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
    
    // Validate event_data exists
    expect(event.event_data).toBeDefined();
    
    // Validate artifacts array exists
    expect(event.event_data.artifacts).toBeDefined();
    expect(Array.isArray(event.event_data.artifacts)).toBe(true);
    
    // Validate artifacts array has exactly 1 element
    expect(event.event_data.artifacts.length).toBeGreaterThan(0);
    expect(event.event_data.artifacts.length).toBe(1);

    // Extract artifact object
    const artifact = event.event_data.artifacts[0];
    
    // Validate artifact properties
    expect(artifact.item_type).toBe('ssor_attachment');
    expect(artifact.item_count).toBe(2);
    expect(artifact.id).toBeDefined();
    expect(typeof artifact.id).toBe('string');
    expect(artifact.id.length).toBeGreaterThan(0);

    // Verify artifact was uploaded to DevRev servers
    const isUploaded = await verifyArtifactUpload(artifact.id);
    expect(isUploaded).toBe(true);
  }, 180000);

  /**
   * Acceptance Test: EXTRACTION_ATTACHMENTS_CONTINUE
   * 
   * This test validates that when the extraction function receives an
   * EXTRACTION_ATTACHMENTS_CONTINUE event, it properly continues attachment
   * streaming and emits exactly one EXTRACTION_ATTACHMENTS_DONE callback event.
   * 
   * Test payload: attachments_extraction_continue_test.json
   * Expected outcome: Single callback event with event_type = EXTRACTION_ATTACHMENTS_DONE
   */
  test('attachments_extraction_continue_success', async () => {
    // Invoke with EXTRACTION_ATTACHMENTS_CONTINUE event
    const payload = loadTestPayload('attachments_extraction_continue_test.json');
    await invokeSnapIn(payload);

    // Wait for callback event
    const event = await callbackServer.waitForEvent(120000);

    // Validate exactly one callback event was received
    const receivedEvents = callbackServer.getReceivedEvents();
    expect(receivedEvents.length).toBe(1);
    
    // Validate the event type is EXTRACTION_ATTACHMENTS_DONE
    expect(event.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
  }, 180000);

  test('attachments_extraction_rate_limiting', async () => {
    // Step 1: Extract data (including attachment metadata) WITHOUT rate limiting
    const dataPayload = loadTestPayload('data_extraction_test.json');
    await invokeSnapIn(dataPayload);

    // Wait for EXTRACTION_DATA_DONE callback
    const dataEvent = await callbackServer.waitForEvent(120000);
    expect(dataEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Step 2: Trigger rate limiting AFTER data extraction completes
    const rateLimitingTriggered = await triggerRateLimiting('attachments_extraction_rate_limiting');
    expect(rateLimitingTriggered).toBe(true);

    // Clear events before attachment streaming
    callbackServer.clearEvents();

    // Step 3: Stream attachments (will encounter rate limiting)
    const attachmentsPayload = loadTestPayload('attachments_extraction_test.json');
    await invokeSnapIn(attachmentsPayload);

    // Wait for callback event
    const event = await callbackServer.waitForEvent(120000);

    // Validate callback event
    const receivedEvents = callbackServer.getReceivedEvents();
    expect(receivedEvents.length).toBe(1);
    expect(event.event_type).toBe('EXTRACTION_ATTACHMENTS_DELAY');
    expect(event.event_data).toBeDefined();
    expect(event.event_data.delay).toBeDefined();
    expect(typeof event.event_data.delay).toBe('number');
    expect(event.event_data.delay).toBeGreaterThan(0);
  }, 180000);
});