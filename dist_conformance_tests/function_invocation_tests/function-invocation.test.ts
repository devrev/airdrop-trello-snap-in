import { CallbackServer, createBaseEvent, sendEventToSnapIn, TestEvent } from './test-utils';

describe('Function Invocation Tests', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearCallbacks();
  });

  describe('Health Check Function - Trivial Test', () => {
    it('should successfully invoke health-check function with valid input', async () => {
      const event = createBaseEvent('health-check', 'test');
      
      const result = await sendEventToSnapIn(event);
      
      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('success');
      expect(result.function_result.message).toBe('Function can be invoked successfully');
      expect(result.function_result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Extraction Function - Simple Test', () => {
    it('should successfully invoke extraction function with external sync units event', async () => {
      const event = createBaseEvent('extraction', 'EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      const result = await sendEventToSnapIn(event);
      
      expect(result).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('Extraction Function - Complex Tests', () => {
    const eventTypes = [
      'EXTRACTION_METADATA_START',
      'EXTRACTION_DATA_START',
      'EXTRACTION_DATA_CONTINUE',
      'EXTRACTION_ATTACHMENTS_START',
      'EXTRACTION_ATTACHMENTS_CONTINUE'
    ];

    eventTypes.forEach(eventType => {
      it(`should successfully invoke extraction function with ${eventType} event`, async () => {
        const event = createBaseEvent('extraction', eventType);
        
        const result = await sendEventToSnapIn(event);
        
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid function name gracefully', async () => {
      const event = createBaseEvent('non-existent-function', 'test');
      
      await expect(sendEventToSnapIn(event)).rejects.toThrow(/Function non-existent-function not found/);
    });

    it('should handle missing required fields in event', async () => {
      const event = createBaseEvent('health-check', 'test');
      delete (event as any).context.dev_oid;
      
      const result = await sendEventToSnapIn(event);
      
      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.function_result).toBeUndefined();
    });
  });
});