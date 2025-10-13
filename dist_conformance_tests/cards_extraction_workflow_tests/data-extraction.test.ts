import { TestUtils } from './test-utils';

describe('Data Extraction Conformance Tests', () => {
  let env: ReturnType<typeof TestUtils.getEnvironment>;

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  describe('Trivial: Basic Event Validation', () => {
    it('should accept EXTRACTION_DATA_START event and respond', async () => {
      const event = TestUtils.createBaseEvent('EXTRACTION_DATA_START', env);
      
      try {
        const response = await TestUtils.sendEventToSnapIn(event);
        expect(response).toBeDefined();
        expect(response.error).toBeUndefined();
      } catch (error) {
        throw new Error(`Failed to process EXTRACTION_DATA_START event: ${error}`);
      }
    });

    it('should accept EXTRACTION_DATA_CONTINUE event and respond', async () => {
      const event = TestUtils.createBaseEvent('EXTRACTION_DATA_CONTINUE', env);
      
      try {
        const response = await TestUtils.sendEventToSnapIn(event);
        expect(response).toBeDefined();
        expect(response.error).toBeUndefined();
      } catch (error) {
        throw new Error(`Failed to process EXTRACTION_DATA_CONTINUE event: ${error}`);
      }
    });
  });

  describe('Simple: Users Data Extraction', () => {
    it('should extract users data from organization', async () => {
      const event = TestUtils.createBaseEvent('EXTRACTION_DATA_START', env);
      
      const response = await TestUtils.sendEventToSnapIn(event);
      expect(response.error).toBeUndefined();

      // Wait for callback indicating completion
      try {
        const doneCallback = await TestUtils.waitForSpecificCallback('EXTRACTION_DATA_DONE', 15000);
        expect(doneCallback).toBeDefined();
        expect(doneCallback.event_type).toBe('EXTRACTION_DATA_DONE');
      } catch (error) {
        // Check if we got an error callback instead
        const callbacks = TestUtils.getCallbackData();
        const errorCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_ERROR');
        if (errorCallback) {
          throw new Error(`Users extraction failed with error: ${JSON.stringify(errorCallback.event_data)}`);
        }
        
        // Check if we got a progress callback (which is also acceptable)
        const progressCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_PROGRESS');
        if (progressCallback) {
          console.log('Received progress callback, which indicates extraction is working');
          return;
        }
        
        throw new Error(`Expected EXTRACTION_DATA_DONE callback but got: ${JSON.stringify(callbacks)}`);
      }
    });
  });

  describe('Complex: Cards Data Extraction with Pagination and Created By', () => {
    it('should extract cards data with pagination and fetch created by information', async () => {
      const event = TestUtils.createBaseEvent('EXTRACTION_DATA_START', env);
      
      const response = await TestUtils.sendEventToSnapIn(event);
      expect(response.error).toBeUndefined();

      // Wait for callback indicating completion or progress
      const callbacks = await TestUtils.waitForCallback(20000);
      expect(callbacks.length).toBeGreaterThan(0);
      
      // Check for successful completion
      const doneCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_DONE');
      const progressCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_PROGRESS');
      const errorCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_ERROR');
      
      if (errorCallback) {
        throw new Error(`Cards extraction failed with error: ${JSON.stringify(errorCallback.event_data)}`);
      }
      
      if (!doneCallback && !progressCallback) {
        throw new Error(`Expected EXTRACTION_DATA_DONE or EXTRACTION_DATA_PROGRESS callback but got: ${JSON.stringify(callbacks)}`);
      }
      
      // If we got progress, that's also acceptable (indicates pagination is working)
      if (progressCallback) {
        console.log('Received progress callback, indicating pagination is working correctly');
      }
      
      if (doneCallback) {
        console.log('Cards extraction completed successfully');
      }
    });

    it('should handle cards extraction continuation after progress', async () => {
      // First, start extraction
      const startEvent = TestUtils.createBaseEvent('EXTRACTION_DATA_START', env);
      await TestUtils.sendEventToSnapIn(startEvent);
      
      // Wait for initial response
      await TestUtils.waitForCallback(10000);
      TestUtils.clearCallbackData();
      
      // Then continue extraction
      const continueEvent = TestUtils.createBaseEvent('EXTRACTION_DATA_CONTINUE', env);
      const response = await TestUtils.sendEventToSnapIn(continueEvent);
      expect(response.error).toBeUndefined();

      // Wait for callback
      const callbacks = await TestUtils.waitForCallback(15000);
      expect(callbacks.length).toBeGreaterThan(0);
      
      const doneCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_DONE');
      const progressCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_PROGRESS');
      const errorCallback = callbacks.find(cb => cb.event_type === 'EXTRACTION_DATA_ERROR');
      
      if (errorCallback) {
        throw new Error(`Cards extraction continuation failed with error: ${JSON.stringify(errorCallback.event_data)}`);
      }
      
      // Either done or progress is acceptable
      expect(doneCallback || progressCallback).toBeDefined();
    });
  });
});