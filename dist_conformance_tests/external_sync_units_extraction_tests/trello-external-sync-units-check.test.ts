import { TestEnvironment } from './test-utils';

describe('Trello External Sync Units Check', () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.startCallbackServer();
    testEnv.clearReceivedEvents();
  });

  afterEach(async () => {
    await testEnv.stopCallbackServer();
  });

  test('should process trello external sync units check event and return exactly 4 boards with SaaS connectors board', async () => {
    // Arrange
    const event = testEnv.loadEventFromJsonFile('trello-external-sync-units-check.json');
    
    console.log('Sending event to snap-in:', JSON.stringify(event, null, 2));

    // Act
    await testEnv.sendEventToSnapIn(event);

    // Assert - Wait for the callback event
    const receivedEvents = await testEnv.waitForEvents(1, 20000);
    
    console.log('Received events from callback server:', JSON.stringify(receivedEvents, null, 2));

    // Verify exactly one event was received
    expect(receivedEvents).toHaveLength(1);
    
    const callbackEvent = receivedEvents[0];
    
    // Verify event type
    expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    
    // Verify event_data exists
    expect(callbackEvent.event_data).toBeDefined();
    if (!callbackEvent.event_data) {
      throw new Error('event_data is undefined in callback event');
    }

    // Verify external_sync_units exists and is an array
    expect(callbackEvent.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callbackEvent.event_data.external_sync_units)).toBe(true);
    
    const externalSyncUnitsArray = callbackEvent.event_data.external_sync_units;
    
    console.log('External sync units array:', JSON.stringify(externalSyncUnitsArray, null, 2));

    // Verify exactly 4 external sync units
    expect(externalSyncUnitsArray).toHaveLength(4);
    if (externalSyncUnitsArray.length !== 4) {
      throw new Error(`Expected exactly 4 external sync units, but received ${externalSyncUnitsArray.length}. Units: ${JSON.stringify(externalSyncUnitsArray, null, 2)}`);
    }

    // Verify that one element has name "SaaS connectors"
    const saasConnectorsBoard = externalSyncUnitsArray.find((unit: any) => unit.name === 'SaaS connectors');
    expect(saasConnectorsBoard).toBeDefined();
    if (!saasConnectorsBoard) {
      const availableNames = externalSyncUnitsArray.map((unit: any) => unit.name);
      throw new Error(`Expected to find a board with name "SaaS connectors", but found boards with names: ${JSON.stringify(availableNames)}. Full units: ${JSON.stringify(externalSyncUnitsArray, null, 2)}`);
    }

    // Additional validation of the structure
    externalSyncUnitsArray.forEach((unit: any, index: number) => {
      expect(unit).toHaveProperty('id');
      expect(unit).toHaveProperty('name');
      expect(unit).toHaveProperty('description');
      expect(unit).toHaveProperty('item_type');
      
      expect(typeof unit.id).toBe('string');
      expect(typeof unit.name).toBe('string');
      expect(typeof unit.description).toBe('string');
      expect(unit.item_type).toBe('cards');
      
      if (!unit.id || !unit.name) {
        throw new Error(`External sync unit at index ${index} is missing required fields. Unit: ${JSON.stringify(unit, null, 2)}`);
      }
    });

    console.log('Test completed successfully. Found SaaS connectors board:', JSON.stringify(saasConnectorsBoard, null, 2));
  });
});