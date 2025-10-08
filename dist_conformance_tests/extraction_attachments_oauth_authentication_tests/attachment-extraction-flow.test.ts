import { getTestEnvironment } from './test-utils/environment';
import { setupCallbackServer, teardownCallbackServer, CallbackServerSetup, waitForCallback } from './test-utils/callback-server';
import { SnapInClient } from './test-utils/snap-in-client';
import dataExtractionEvent from './test-events/data-extraction-test.json';
import attachmentsExtractionEvent from './test-events/attachments-extraction-test.json';
import axios from 'axios';

describe('Attachment Extraction Flow Test', () => {
  let callbackServer: CallbackServerSetup;
  let snapInClient: SnapInClient;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
    snapInClient = new SnapInClient();
  });

  afterAll(async () => {
    await teardownCallbackServer(callbackServer);
  });

  beforeEach(() => {
    callbackServer.receivedCallbacks.length = 0;
  });

  function createTestEvent(baseEvent: any) {
    const event = JSON.parse(JSON.stringify(baseEvent));
    event.payload.connection_data.key = event.payload.connection_data.key
      .replace('<TRELLO_API_KEY>', testEnv.trelloApiKey)
      .replace('<TRELLO_TOKEN>', testEnv.trelloToken);
    event.payload.connection_data.org_id = event.payload.connection_data.org_id
      .replace('<TRELLO_ORGANIZATION_ID>', testEnv.trelloOrganizationId);
    return event;
  }

  test('should complete the full attachment extraction flow', async () => {
    // Step 1: Data extraction
    console.log('Step 1: Starting data extraction...');
    const dataEvent = createTestEvent(dataExtractionEvent);
    
    const dataResponse = await snapInClient.callFunction('extraction', dataEvent);
    
    if (!dataResponse.success) {
      console.error('Step 1 failed - Data extraction error:', dataResponse.error);
      console.error('Event payload:', JSON.stringify(dataEvent, null, 2));
      throw new Error(`Step 1 failed: ${dataResponse.message}`);
    }

    console.log('Step 1: Waiting for EXTRACTION_DATA_DONE callback...');
    const dataCallback = await waitForCallback(callbackServer, 30000, (callback) => {
      return callback.body?.event_type === 'EXTRACTION_DATA_DONE';
    });

    if (!dataCallback) {
      console.error('Step 1 failed - No EXTRACTION_DATA_DONE callback received');
      console.error('Received callbacks:', callbackServer.receivedCallbacks.map(cb => ({
        event_type: cb.body?.event_type,
        timestamp: cb.timestamp
      })));
      throw new Error('Step 1 failed: Expected callback with event_type "EXTRACTION_DATA_DONE" was not received within 30 seconds');
    }

    expect(dataCallback.body.event_type).toBe('EXTRACTION_DATA_DONE');
    console.log('Step 1: Successfully received EXTRACTION_DATA_DONE callback');

    // Clear callbacks before step 2
    callbackServer.receivedCallbacks.length = 0;

    // Step 2: Attachments extraction
    console.log('Step 2: Starting attachments extraction...');
    const attachmentsEvent = createTestEvent(attachmentsExtractionEvent);
    
    const attachmentsResponse = await snapInClient.callFunction('extraction', attachmentsEvent);
    
    if (!attachmentsResponse.success) {
      console.error('Step 2 failed - Attachments extraction error:', attachmentsResponse.error);
      console.error('Event payload:', JSON.stringify(attachmentsEvent, null, 2));
      throw new Error(`Step 2 failed: ${attachmentsResponse.message}`);
    }

    console.log('Step 2: Waiting for EXTRACTION_ATTACHMENTS_DONE callback...');
    const attachmentsCallback = await waitForCallback(callbackServer, 60000, (callback) => {
      return callback.body?.event_type === 'EXTRACTION_ATTACHMENTS_DONE';
    });

    if (!attachmentsCallback) {
      console.error('Step 2 failed - No EXTRACTION_ATTACHMENTS_DONE callback received');
      console.error('Received callbacks:', callbackServer.receivedCallbacks.map(cb => ({
        event_type: cb.body?.event_type,
        timestamp: cb.timestamp,
        body: cb.body
      })));
      throw new Error('Step 2 failed: Expected callback with event_type "EXTRACTION_ATTACHMENTS_DONE" was not received within 60 seconds');
    }

    expect(attachmentsCallback.body.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
    console.log('Step 2: Successfully received EXTRACTION_ATTACHMENTS_DONE callback');

    // Validate event_data.artifacts
    const eventFromCallbackServer = attachmentsCallback.body;
    
    if (!eventFromCallbackServer.event_data) {
      console.error('Step 2 validation failed - Missing event_data in callback');
      console.error('Actual callback body:', JSON.stringify(eventFromCallbackServer, null, 2));
      throw new Error('Step 2 validation failed: event_data is missing from callback');
    }

    if (!eventFromCallbackServer.event_data.artifacts) {
      console.error('Step 2 validation failed - Missing artifacts in event_data');
      console.error('Actual event_data:', JSON.stringify(eventFromCallbackServer.event_data, null, 2));
      throw new Error('Step 2 validation failed: event_data.artifacts is missing from callback');
    }

    if (!Array.isArray(eventFromCallbackServer.event_data.artifacts)) {
      console.error('Step 2 validation failed - artifacts is not an array');
      console.error('Actual artifacts type:', typeof eventFromCallbackServer.event_data.artifacts);
      console.error('Actual artifacts value:', eventFromCallbackServer.event_data.artifacts);
      throw new Error('Step 2 validation failed: event_data.artifacts is not an array');
    }

    const artifacts = eventFromCallbackServer.event_data.artifacts;
    
    if (artifacts.length === 0) {
      console.error('Step 2 validation failed - artifacts array is empty');
      console.error('Actual artifacts:', artifacts);
      throw new Error('Step 2 validation failed: event_data.artifacts array is empty');
    }

    if (artifacts.length !== 1) {
      console.error('Step 2 validation failed - artifacts array length is not 1');
      console.error('Expected length: 1, Actual length:', artifacts.length);
      console.error('Actual artifacts:', artifacts);
      throw new Error(`Step 2 validation failed: event_data.artifacts array length is ${artifacts.length}, expected 1`);
    }

    const artifactObject = artifacts[0];
    
    if (artifactObject.item_type !== 'ssor_attachment') {
      console.error('Step 2 validation failed - incorrect item_type');
      console.error('Expected item_type: "ssor_attachment", Actual item_type:', artifactObject.item_type);
      console.error('Actual artifact object:', JSON.stringify(artifactObject, null, 2));
      throw new Error(`Step 2 validation failed: artifact.item_type is "${artifactObject.item_type}", expected "ssor_attachment"`);
    }

    if (artifactObject.item_count !== 2) {
      console.error('Step 2 validation failed - incorrect item_count');
      console.error('Expected item_count: 2, Actual item_count:', artifactObject.item_count);
      console.error('Actual artifact object:', JSON.stringify(artifactObject, null, 2));
      throw new Error(`Step 2 validation failed: artifact.item_count is ${artifactObject.item_count}, expected 2`);
    }

    if (!artifactObject.id) {
      console.error('Step 2 validation failed - missing artifact id');
      console.error('Actual artifact object:', JSON.stringify(artifactObject, null, 2));
      throw new Error('Step 2 validation failed: artifact.id is missing');
    }

    console.log('Step 2: Artifact validation successful:', {
      item_type: artifactObject.item_type,
      item_count: artifactObject.item_count,
      id: artifactObject.id
    });

    // Verify artifact upload status
    console.log('Step 2: Verifying artifact upload status...');
    try {
      const uploadResponse = await axios.get(`http://localhost:8003/is_uploaded/${artifactObject.id}`);
      
      if (uploadResponse.status !== 200) {
        console.error('Step 2 validation failed - artifact upload verification failed');
        console.error('Expected status: 200, Actual status:', uploadResponse.status);
        console.error('Response data:', uploadResponse.data);
        throw new Error(`Step 2 validation failed: artifact upload verification returned status ${uploadResponse.status}, expected 200`);
      }

      console.log('Step 2: Artifact upload verification successful');
    } catch (error: any) {
      console.error('Step 2 validation failed - error during artifact upload verification');
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Step 2 validation failed: error during artifact upload verification: ${error.message}`);
    }

    console.log('Attachment extraction flow completed successfully!');
  }, 120000); // 2 minute timeout for the entire flow
});