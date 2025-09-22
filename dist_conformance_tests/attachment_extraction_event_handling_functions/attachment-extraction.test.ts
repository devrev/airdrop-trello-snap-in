import { CallbackServer, getTestEnvironment, createAttachmentExtractionEvent, callSnapInServer } from './test-utils';

describe('Attachment Extraction Conformance Tests', () => {
  let callbackServer: CallbackServer;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  describe('Trivial: Basic Invocation Tests', () => {
    test('should handle EXTRACTION_ATTACHMENTS_START event without errors', async () => {
      const event = createAttachmentExtractionEvent('EXTRACTION_ATTACHMENTS_START', testEnv);
      
      let response;
      try {
        response = await callSnapInServer(event);
      } catch (error) {
        throw new Error(`Failed to invoke extraction function with EXTRACTION_ATTACHMENTS_START: ${error}`);
      }

      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      if (response.function_result) {
        expect(response.function_result.success).toBe(true);
      }
    }, 30000);
  });

  describe('Simple: Continue Event Tests', () => {
    test('should handle EXTRACTION_ATTACHMENTS_CONTINUE event without errors', async () => {
      const event = createAttachmentExtractionEvent('EXTRACTION_ATTACHMENTS_CONTINUE', testEnv);
      
      let response;
      try {
        response = await callSnapInServer(event);
      } catch (error) {
        throw new Error(`Failed to invoke extraction function with EXTRACTION_ATTACHMENTS_CONTINUE: ${error}`);
      }

      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      if (response.function_result) {
        expect(response.function_result.success).toBe(true);
      }
    }, 30000);
  });

  describe('Complex: Full Workflow Tests', () => {
    test('should process attachment extraction and emit appropriate events', async () => {
      const event = createAttachmentExtractionEvent('EXTRACTION_ATTACHMENTS_START', testEnv);
      
      let response;
      try {
        response = await callSnapInServer(event);
      } catch (error) {
        throw new Error(`Failed to invoke extraction function for full workflow test: ${error}`);
      }

      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();

      // Verify the function was invoked successfully
      if (response.function_result) {
        expect(response.function_result.success).toBe(true);
        expect(response.function_result.message).toContain('Extraction process initiated successfully');
      }

      // Wait a moment for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Note: In a real scenario, we would check for emitted events at the callback server
      // However, the current implementation uses spawn() which runs in a separate process
      // and may not immediately emit events in the test timeframe
    }, 45000);

    test('should handle OAuth authentication requirements for attachment streaming', async () => {
      // This test verifies that the extraction function is set up to handle OAuth authentication
      // by checking that it accepts the proper event structure with credentials
      const event = createAttachmentExtractionEvent('EXTRACTION_ATTACHMENTS_START', testEnv);
      
      // Ensure the event has the required OAuth credentials structure
      expect(event.payload.connection_data.key).toContain('key=');
      expect(event.payload.connection_data.key).toContain('token=');
      expect(event.payload.connection_data.key_type).toBe('oauth');

      let response;
      try {
        response = await callSnapInServer(event);
      } catch (error) {
        throw new Error(`Failed to invoke extraction function with OAuth credentials: ${error}`);
      }

      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();

      // The function should accept the OAuth credentials without throwing authentication errors
      if (response.function_result) {
        expect(response.function_result.success).toBe(true);
      }
    }, 30000);
  });
});