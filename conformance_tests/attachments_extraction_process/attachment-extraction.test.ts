import {
  CallbackServer,
  createEventPayload,
  sendEventToSnapIn,
  validateEnvironment,
  TEST_BOARD_ID
} from './test-utils';

describe('Attachment Extraction Tests', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    // Validate environment variables
    validateEnvironment();
    
    // Start callback server
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    // Stop callback server
    await callbackServer.stop();
  });

  beforeEach(() => {
    // Clear events before each test
    callbackServer.clearEvents();
  });

  // Test 1: Basic test - Verify that the attachment extraction function exists
  test('extraction function exists and can be called', async () => {
    // Create event payload for EXTRACTION_ATTACHMENTS_START
    const eventPayload = createEventPayload('EXTRACTION_ATTACHMENTS_START');
    
    // Send event to snap-in server
    const response = await sendEventToSnapIn(eventPayload);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
  });

  // Test 2: Simple test - Test that the function properly handles the EXTRACTION_ATTACHMENTS_START event
  test('handles EXTRACTION_ATTACHMENTS_START event correctly', async () => {
    // Create event payload for EXTRACTION_ATTACHMENTS_START
    const eventPayload = createEventPayload('EXTRACTION_ATTACHMENTS_START');
    
    // Add board ID to event context
    eventPayload.payload.event_context.external_sync_unit_id = TEST_BOARD_ID;
    
    // Send event to snap-in server
    const response = await sendEventToSnapIn(eventPayload);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Extraction process initiated');
  });

  // Test 3: More complex test - Test the EXTRACTION_ATTACHMENTS_CONTINUE event
  test('handles EXTRACTION_ATTACHMENTS_CONTINUE event correctly', async () => {
    // Create event payload for EXTRACTION_ATTACHMENTS_CONTINUE
    const eventPayload = createEventPayload('EXTRACTION_ATTACHMENTS_CONTINUE');
    
    // Add board ID to event context
    eventPayload.payload.event_context.external_sync_unit_id = TEST_BOARD_ID;
    
    // Send event to snap-in server
    const response = await sendEventToSnapIn(eventPayload);
    
    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Extraction process initiated');
  });
});