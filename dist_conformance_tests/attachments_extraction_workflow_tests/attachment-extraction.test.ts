import { TestUtils, TestEnvironment } from './test-utils';

describe('Attachment Extraction Tests', () => {
  let env: TestEnvironment;

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

  test('should extract and normalize attachments during data extraction', async () => {
    const event = TestUtils.createExtractionEvent('EXTRACTION_DATA_START', env);
    
    const response = await TestUtils.sendEventToSnapIn(event);
    
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    // Wait for callback data to be received
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const callbackData = TestUtils.getCallbackData();
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Find attachment-related callbacks
    const attachmentCallbacks = callbackData.filter(cb => 
      cb.body && cb.body.data && Array.isArray(cb.body.data) &&
      cb.body.data.some((item: any) => item.url && item.file_name && item.parent_id)
    );
    
    if (attachmentCallbacks.length > 0) {
      const attachmentData = attachmentCallbacks[0].body.data;
      const attachment = attachmentData.find((item: any) => item.url && item.file_name);
      
      expect(attachment).toBeDefined();
      expect(attachment.url).toBeDefined();
      expect(attachment.file_name).toBeDefined();
      expect(attachment.parent_id).toBeDefined();
      expect(typeof attachment.url).toBe('string');
      expect(typeof attachment.file_name).toBe('string');
      expect(typeof attachment.parent_id).toBe('string');
    }
  }, 30000);

  test('should transform Trello attachment URLs correctly', async () => {
    const event = TestUtils.createExtractionEvent('EXTRACTION_DATA_START', env);
    
    const response = await TestUtils.sendEventToSnapIn(event);
    
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    // Wait for callback data to be received
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const callbackData = TestUtils.getCallbackData();
    
    // Find attachment-related callbacks
    const attachmentCallbacks = callbackData.filter(cb => 
      cb.body && cb.body.data && Array.isArray(cb.body.data) &&
      cb.body.data.some((item: any) => item.url && item.file_name && item.parent_id)
    );
    
    if (attachmentCallbacks.length > 0) {
      const attachmentData = attachmentCallbacks[0].body.data;
      const trelloAttachments = attachmentData.filter((item: any) => 
        item.url && item.url.includes('api.trello.com')
      );
      
      trelloAttachments.forEach((attachment: any) => {
        // Check URL format for Trello attachments
        if (attachment.url.startsWith('https://api.trello.com/1/cards/')) {
          const urlPattern = /^https:\/\/api\.trello\.com\/1\/cards\/[^\/]+\/attachments\/[^\/]+\/download\/.+$/;
          expect(attachment.url).toMatch(urlPattern);
          expect(attachment.parent_id).toBeDefined();
          expect(attachment.file_name).toBeDefined();
        }
      });
    }
  }, 30000);

  test('should manage attachment extraction state correctly', async () => {
    const event = TestUtils.createExtractionEvent('EXTRACTION_DATA_START', env);
    
    const response = await TestUtils.sendEventToSnapIn(event);
    
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    // Wait for extraction to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const callbackData = TestUtils.getCallbackData();
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Check for completion event
    const completionCallbacks = callbackData.filter(cb => 
      cb.body && cb.body.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    expect(completionCallbacks.length).toBeGreaterThan(0);
    
    // Verify that attachments were processed by checking the completion event
    const completionEvent = completionCallbacks[0];
    expect(completionEvent.body.event_data).toBeDefined();
    expect(completionEvent.body.event_data.artifacts).toBeDefined();
    expect(Array.isArray(completionEvent.body.event_data.artifacts)).toBe(true);
    
    // Check that attachments artifact was created
    const attachmentsArtifact = completionEvent.body.event_data.artifacts.find(
      (artifact: any) => artifact.item_type === 'attachments'
    );
    
    // If there are attachments in the test data, verify they were processed
    if (attachmentsArtifact) {
      expect(attachmentsArtifact.item_count).toBeGreaterThanOrEqual(0);
      expect(attachmentsArtifact.id).toBeDefined();
    }
  }, 35000);
});