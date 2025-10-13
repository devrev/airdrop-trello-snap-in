import { 
  getTestEnvironment, 
  setupCallbackServer, 
  sendEventToSnapIn, 
  loadTestEventFromFile,
  waitForCallbackEvent,
  verifyArtifactUpload,
  CallbackServerSetup 
} from './test-utils';

describe('Attachment Extraction Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should complete full attachment extraction flow', async () => {
    console.log('Starting Attachment Extraction Acceptance Test');
    const testStartTime = Date.now();

    try {
      // Step 1: Data extraction
      console.log('Step 1: Starting data extraction...');
      const step1StartTime = Date.now();
      
      const dataExtractionEvent = loadTestEventFromFile('data_extraction_test.json', testEnv);
      console.log(`Loaded data extraction event: ${JSON.stringify({
        event_type: dataExtractionEvent.payload.event_type,
        external_sync_unit_id: dataExtractionEvent.payload.event_context.external_sync_unit_id,
        request_id: dataExtractionEvent.execution_metadata.request_id
      })}`);

      const dataExtractionResponse = await sendEventToSnapIn(dataExtractionEvent);
      const step1EndTime = Date.now();
      
      console.log(`Data extraction request completed in ${step1EndTime - step1StartTime}ms`);
      console.log(`Data extraction response: ${JSON.stringify(dataExtractionResponse)}`);

      if (dataExtractionResponse.error) {
        throw new Error(
          `Step 1 failed: Data extraction returned error: ${JSON.stringify(dataExtractionResponse.error)}. ` +
          `Event: ${JSON.stringify(dataExtractionEvent, null, 2)}`
        );
      }

      // Wait for EXTRACTION_DATA_DONE callback
      console.log('Waiting for EXTRACTION_DATA_DONE callback...');
      const dataCallbackStartTime = Date.now();
      
      const dataCallbackEvent = await waitForCallbackEvent(
        callbackServer, 
        'EXTRACTION_DATA_DONE', 
        45000
      );
      const dataCallbackEndTime = Date.now();
      
      console.log(`Received EXTRACTION_DATA_DONE callback after ${dataCallbackEndTime - dataCallbackStartTime}ms`);
      console.log(`Data callback event: ${JSON.stringify(dataCallbackEvent)}`);

      expect(dataCallbackEvent).toBeDefined();
      expect(dataCallbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

      // Step 2: Attachment extraction
      console.log('Step 2: Starting attachment extraction...');
      const step2StartTime = Date.now();
      
      const attachmentExtractionEvent = loadTestEventFromFile('attachments_extraction_test.json', testEnv);
      console.log(`Loaded attachment extraction event: ${JSON.stringify({
        event_type: attachmentExtractionEvent.payload.event_type,
        external_sync_unit_id: attachmentExtractionEvent.payload.event_context.external_sync_unit_id,
        request_id: attachmentExtractionEvent.execution_metadata.request_id
      })}`);

      const attachmentExtractionResponse = await sendEventToSnapIn(attachmentExtractionEvent);
      const step2EndTime = Date.now();
      
      console.log(`Attachment extraction request completed in ${step2EndTime - step2StartTime}ms`);
      console.log(`Attachment extraction response: ${JSON.stringify(attachmentExtractionResponse)}`);

      if (attachmentExtractionResponse.error) {
        throw new Error(
          `Step 2 failed: Attachment extraction returned error: ${JSON.stringify(attachmentExtractionResponse.error)}. ` +
          `Event: ${JSON.stringify(attachmentExtractionEvent, null, 2)}`
        );
      }

      // Wait for EXTRACTION_ATTACHMENTS_DONE callback
      console.log('Waiting for EXTRACTION_ATTACHMENTS_DONE callback...');
      const attachmentCallbackStartTime = Date.now();
      
      const attachmentCallbackEvent = await waitForCallbackEvent(
        callbackServer, 
        'EXTRACTION_ATTACHMENTS_DONE', 
        60000
      );
      const attachmentCallbackEndTime = Date.now();
      
      console.log(`Received EXTRACTION_ATTACHMENTS_DONE callback after ${attachmentCallbackEndTime - attachmentCallbackStartTime}ms`);
      console.log(`Attachment callback event: ${JSON.stringify(attachmentCallbackEvent, null, 2)}`);

      // Validate callback event structure
      expect(attachmentCallbackEvent).toBeDefined();
      expect(attachmentCallbackEvent.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
      
      if (!attachmentCallbackEvent.event_data) {
        throw new Error(
          `Missing event_data in attachment callback event. ` +
          `Full event: ${JSON.stringify(attachmentCallbackEvent, null, 2)}`
        );
      }

      if (!attachmentCallbackEvent.event_data.artifacts) {
        throw new Error(
          `Missing artifacts array in event_data. ` +
          `Available keys: ${Object.keys(attachmentCallbackEvent.event_data)}. ` +
          `Full event_data: ${JSON.stringify(attachmentCallbackEvent.event_data, null, 2)}`
        );
      }

      const artifacts = attachmentCallbackEvent.event_data.artifacts;
      
      if (!Array.isArray(artifacts)) {
        throw new Error(
          `artifacts is not an array. Type: ${typeof artifacts}, Value: ${JSON.stringify(artifacts)}`
        );
      }

      if (artifacts.length === 0) {
        throw new Error(
          `artifacts array is empty. Expected at least one artifact. ` +
          `Full event_data: ${JSON.stringify(attachmentCallbackEvent.event_data, null, 2)}`
        );
      }

      if (artifacts.length !== 1) {
        throw new Error(
          `Expected exactly 1 artifact, but got ${artifacts.length}. ` +
          `Artifacts: ${JSON.stringify(artifacts, null, 2)}`
        );
      }

      const artifactObject = artifacts[0];
      console.log(`Artifact object: ${JSON.stringify(artifactObject, null, 2)}`);

      // Validate artifact object structure
      if (!artifactObject.item_type) {
        throw new Error(
          `Missing item_type in artifact object. ` +
          `Available keys: ${Object.keys(artifactObject)}. ` +
          `Full artifact: ${JSON.stringify(artifactObject, null, 2)}`
        );
      }

      if (artifactObject.item_type !== 'ssor_attachment') {
        throw new Error(
          `Expected item_type to be 'ssor_attachment', but got '${artifactObject.item_type}'. ` +
          `Full artifact: ${JSON.stringify(artifactObject, null, 2)}`
        );
      }

      if (typeof artifactObject.item_count !== 'number') {
        throw new Error(
          `Expected item_count to be a number, but got ${typeof artifactObject.item_count}: ${artifactObject.item_count}. ` +
          `Full artifact: ${JSON.stringify(artifactObject, null, 2)}`
        );
      }

      if (artifactObject.item_count !== 2) {
        throw new Error(
          `Expected item_count to be 2, but got ${artifactObject.item_count}. ` +
          `Full artifact: ${JSON.stringify(artifactObject, null, 2)}`
        );
      }

      if (!artifactObject.id) {
        throw new Error(
          `Missing id in artifact object. ` +
          `Available keys: ${Object.keys(artifactObject)}. ` +
          `Full artifact: ${JSON.stringify(artifactObject, null, 2)}`
        );
      }

      // Verify artifact upload
      console.log(`Verifying artifact upload for ID: ${artifactObject.id}`);
      const verificationStartTime = Date.now();
      
      await verifyArtifactUpload(artifactObject.id);
      const verificationEndTime = Date.now();
      
      console.log(`Artifact upload verification completed in ${verificationEndTime - verificationStartTime}ms`);

      const testEndTime = Date.now();
      console.log(`Attachment Extraction Acceptance Test completed successfully in ${testEndTime - testStartTime}ms`);
      
      // Log final summary
      console.log('Test Summary:');
      console.log(`- Step 1 (Data Extraction): ${step1EndTime - step1StartTime}ms`);
      console.log(`- Step 1 Callback Wait: ${dataCallbackEndTime - dataCallbackStartTime}ms`);
      console.log(`- Step 2 (Attachment Extraction): ${step2EndTime - step2StartTime}ms`);
      console.log(`- Step 2 Callback Wait: ${attachmentCallbackEndTime - attachmentCallbackStartTime}ms`);
      console.log(`- Artifact Verification: ${verificationEndTime - verificationStartTime}ms`);
      console.log(`- Total Test Time: ${testEndTime - testStartTime}ms`);
      console.log(`- Total Callback Events Received: ${callbackServer.receivedEvents.length}`);

    } catch (error) {
      const testEndTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Attachment Extraction Acceptance Test failed after ${testEndTime - testStartTime}ms`);
      console.error(`Error: ${errorMessage}`);
      console.error(`Total callback events received: ${callbackServer.receivedEvents.length}`);
      console.error(`Callback events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`);
      
      throw new Error(
        `Attachment Extraction Acceptance Test failed: ${errorMessage}. ` +
        `Test duration: ${testEndTime - testStartTime}ms. ` +
        `Callback events received: ${callbackServer.receivedEvents.length}`
      );
    }
  }, 120000);
});