import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import {
  getTestConfig,
  getTrelloCredentials,
  setupCallbackServer,
  teardownCallbackServer,
  sendEventToSnapIn,
} from './test/main';

describe('External Sync Units Extraction', () => {
  let callbackServer: Server;
  let receivedCallbacks: any[];
  const testConfig = getTestConfig();

  beforeEach(async () => {
    // Setup callback server
    const setup = await setupCallbackServer(testConfig.callbackServerPort);
    callbackServer = setup.server;
    receivedCallbacks = setup.receivedCallbacks;
  });

  afterEach(async () => {
    // Teardown callback server
    if (callbackServer) {
      await teardownCallbackServer(callbackServer);
    }
  });

  it('should extract external sync units and return expected boards', async () => {
    // Load test event from fixture
    const fixtureContent = fs.readFileSync(
      path.join(__dirname, 'test/fixtures/external-sync-units-event.json'),
      'utf-8'
    );
    const testEvent = JSON.parse(fixtureContent);

    // Get credentials from environment
    const credentials = getTrelloCredentials();

    // Replace placeholders with actual credentials
    testEvent.payload.connection_data.org_id = credentials.orgId;
    testEvent.payload.connection_data.key = `key=${credentials.apiKey}&token=${credentials.token}`;

    console.log('Sending event to snap-in server...');
    console.log('Event type:', testEvent.payload.event_type);
    console.log('Organization ID:', credentials.orgId);

    // Send event to snap-in server
    const response = await sendEventToSnapIn(testConfig.snapInServerUrl, testEvent);

    console.log('Received response from snap-in server');
    console.log('Response:', JSON.stringify(response, null, 2));

    // Wait for callback with timeout
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    let callbackReceived = false;

    while (Date.now() - startTime < maxWaitTime) {
      if (receivedCallbacks.length > 0) {
        callbackReceived = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!callbackReceived) {
      throw new Error(
        `Timeout waiting for callback after ${maxWaitTime}ms. No callbacks received.`
      );
    }

    console.log('Callback received');
    console.log('Number of callbacks:', receivedCallbacks.length);

    // Validation 1: Expect exactly one callback
    if (receivedCallbacks.length !== 1) {
      console.error('All received callbacks:', JSON.stringify(receivedCallbacks, null, 2));
      throw new Error(
        `Expected to receive exactly 1 callback, but received ${receivedCallbacks.length}. ` +
        `This indicates the snap-in may have sent multiple events or no events at all.`
      );
    }

    const callback = receivedCallbacks[0];
    console.log('Callback payload:', JSON.stringify(callback, null, 2));

    // Validation 2: Verify event_type
    const eventType = callback.event_type;
    if (eventType !== 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE') {
      console.error('Received callback:', JSON.stringify(callback, null, 2));
      throw new Error(
        `Expected event_type to be 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', but got '${eventType}'. ` +
        `This indicates the extraction may have failed or returned an error event.`
      );
    }

    // Validation 3: Verify event_data exists
    if (!callback.event_data) {
      console.error('Received callback:', JSON.stringify(callback, null, 2));
      throw new Error(
        'Expected callback to contain event_data field, but it was missing. ' +
        'This indicates the response structure is incorrect.'
      );
    }

    // Validation 4: Verify external_sync_units exists and is an array
    const externalSyncUnits = callback.event_data.external_sync_units;
    if (!externalSyncUnits) {
      console.error('Received event_data:', JSON.stringify(callback.event_data, null, 2));
      throw new Error(
        'Expected event_data to contain external_sync_units field, but it was missing. ' +
        'This indicates the extraction did not return any sync units.'
      );
    }

    if (!Array.isArray(externalSyncUnits)) {
      console.error('Received external_sync_units:', JSON.stringify(externalSyncUnits, null, 2));
      throw new Error(
        `Expected external_sync_units to be an array, but got ${typeof externalSyncUnits}. ` +
        `This indicates the data structure is incorrect.`
      );
    }

    console.log('External sync units count:', externalSyncUnits.length);
    console.log('External sync units:', JSON.stringify(externalSyncUnits, null, 2));

    // Validation 5: Verify array length is 4
    if (externalSyncUnits.length !== 4) {
      const unitNames = externalSyncUnits.map((unit: any) => unit.name || 'unnamed');
      console.error('Received external sync units:', JSON.stringify(externalSyncUnits, null, 2));
      throw new Error(
        `Expected external_sync_units array length to be 4, but got ${externalSyncUnits.length}. ` +
        `Received units: [${unitNames.join(', ')}]. ` +
        `This indicates the Trello organization may have a different number of boards than expected.`
      );
    }

    // Validation 6: Verify at least one unit has name "SaaS connectors"
    const unitNames = externalSyncUnits.map((unit: any) => unit.name);
    const hasSaaSConnectors = externalSyncUnits.some(
      (unit: any) => unit.name === 'SaaS connectors'
    );

    if (!hasSaaSConnectors) {
      console.error('Received external sync units:', JSON.stringify(externalSyncUnits, null, 2));
      throw new Error(
        `Expected to find an external sync unit with name 'SaaS connectors', but none found. ` +
        `Available names: [${unitNames.join(', ')}]. ` +
        `This indicates the expected board is missing or has a different name in the Trello organization.`
      );
    }

    console.log('All validations passed successfully');
    console.log('Found external sync unit with name "SaaS connectors"');

    // Additional logging for debugging
    externalSyncUnits.forEach((unit: any, index: number) => {
      console.log(`Unit ${index + 1}:`, {
        id: unit.id,
        name: unit.name,
        description: unit.description,
        item_type: unit.item_type,
      });
    });
  });
});