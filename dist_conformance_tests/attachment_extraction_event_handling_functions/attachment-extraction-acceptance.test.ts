import { CallbackServer, getTestEnvironment, createEventFromJson, callSnapInServer, checkArtifactUpload } from './test-utils';
import dataExtractionTestJson from './data_extraction_test.json';
import attachmentsExtractionTestJson from './attachments_extraction_test.json';

describe('Attachment Extraction Acceptance Tests', () => {
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

  describe('The Attachment Test Flow', () => {
    test('should complete full attachment extraction workflow', async () => {
      // Step 1: Invoke The Extraction Function using data_extraction_test.json
      console.log('Step 1: Starting data extraction...');
      
      const dataExtractionEvent = createEventFromJson(dataExtractionTestJson, testEnv);
      
      let dataExtractionResponse;
      try {
        dataExtractionResponse = await callSnapInServer(dataExtractionEvent);
      } catch (error) {
        throw new Error(`Step 1 failed: Failed to invoke extraction function with data extraction event: ${error}`);
      }

      expect(dataExtractionResponse).toBeDefined();
      if (dataExtractionResponse.error) {
        throw new Error(`Step 1 failed: Extraction function returned error: ${JSON.stringify(dataExtractionResponse.error)}`);
      }

      // Wait for callback event from DevRev for data extraction
      console.log('Step 1: Waiting for EXTRACTION_DATA_DONE event...');
      const dataExtractionCallbackEvent = await callbackServer.waitForEvent('EXTRACTION_DATA_DONE', 60000);
      
      if (!dataExtractionCallbackEvent) {
        const receivedEvents = callbackServer.getEvents();
        throw new Error(`Step 1 failed: Expected to receive EXTRACTION_DATA_DONE event from DevRev callback server, but received: ${JSON.stringify(receivedEvents)}`);
      }

      expect(dataExtractionCallbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
      console.log('Step 1: Successfully received EXTRACTION_DATA_DONE event');

      // Clear events before step 2
      callbackServer.clearEvents();

      // Step 2: Invoke The Extraction Function using attachments_extraction_test.json
      console.log('Step 2: Starting attachment extraction...');
      
      const attachmentExtractionEvent = createEventFromJson(attachmentsExtractionTestJson, testEnv);
      
      let attachmentExtractionResponse;
      try {
        attachmentExtractionResponse = await callSnapInServer(attachmentExtractionEvent);
      } catch (error) {
        throw new Error(`Step 2 failed: Failed to invoke extraction function with attachment extraction event: ${error}`);
      }

      expect(attachmentExtractionResponse).toBeDefined();
      if (attachmentExtractionResponse.error) {
        throw new Error(`Step 2 failed: Extraction function returned error: ${JSON.stringify(attachmentExtractionResponse.error)}`);
      }

      // Wait for callback event from DevRev for attachment extraction
      console.log('Step 2: Waiting for EXTRACTION_ATTACHMENTS_DONE event...');
      const attachmentCallbackEvent = await callbackServer.waitForEvent('EXTRACTION_ATTACHMENTS_DONE', 60000);
      
      if (!attachmentCallbackEvent) {
        const receivedEvents = callbackServer.getEvents();
        throw new Error(`Step 2 failed: Expected to receive EXTRACTION_ATTACHMENTS_DONE event from DevRev callback server, but received: ${JSON.stringify(receivedEvents)}`);
      }

      expect(attachmentCallbackEvent.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
      console.log('Step 2: Successfully received EXTRACTION_ATTACHMENTS_DONE event');

      // Validate event_data.artifacts
      const eventData = attachmentCallbackEvent.data;
      if (!eventData) {
        throw new Error('Step 2 failed: Callback event data is missing');
      }

      const artifacts = eventData.artifacts;
      if (!Array.isArray(artifacts)) {
        throw new Error(`Step 2 failed: Expected event_data.artifacts to be an array, but got: ${typeof artifacts}`);
      }

      if (artifacts.length === 0) {
        throw new Error('Step 2 failed: Expected event_data.artifacts array to not be empty');
      }

      if (artifacts.length !== 1) {
        throw new Error(`Step 2 failed: Expected event_data.artifacts array to have length 1, but got length: ${artifacts.length}`);
      }

      const artifactObject = artifacts[0];
      console.log('Step 2: Validating artifact object:', JSON.stringify(artifactObject));

      // Validate artifact_object properties
      if (artifactObject.item_type !== 'ssor_attachment') {
        throw new Error(`Step 2 failed: Expected artifact_object.item_type to be 'ssor_attachment', but got: '${artifactObject.item_type}'`);
      }

      if (artifactObject.item_count !== 2) {
        throw new Error(`Step 2 failed: Expected artifact_object.item_count to be 2, but got: ${artifactObject.item_count}`);
      }

      // Verify artifact upload
      console.log('Step 2: Checking artifact upload status...');
      const artifactId = artifactObject.id;
      if (!artifactId) {
        throw new Error('Step 2 failed: artifact_object.id is missing');
      }

      try {
        const uploadStatus = await checkArtifactUpload(artifactId);
        if (uploadStatus !== 200) {
          throw new Error(`Step 2 failed: Expected artifact upload check to return status 200, but got: ${uploadStatus}`);
        }
      } catch (error) {
        throw new Error(`Step 2 failed: Failed to check artifact upload status: ${error}`);
      }

      console.log('Step 2: Successfully validated artifact upload');
      console.log('The Attachment Test Flow completed successfully');
    }, 120000); // 2 minute timeout for the full workflow
  });
});