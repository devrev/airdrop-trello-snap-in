import { TestEnvironment } from './test-utils';

describe('External Sync Units Extraction', () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.startCallbackServer();
    testEnv.clearReceivedEvents();
  });

  afterEach(async () => {
    await testEnv.stopCallbackServer();
  });

  test('should handle EXTRACTION_EXTERNAL_SYNC_UNITS_START event and emit EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', async () => {
    // Arrange
    const event = testEnv.createExternalSyncUnitsStartEvent();

    // Act
    await testEnv.sendEventToSnapIn(event);

    // Assert - Wait for the callback event
    const receivedEvents = await testEnv.waitForEvents(1, 15000);
    
    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(receivedEvents[0].event_data).toBeDefined();
    expect(receivedEvents[0].event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(receivedEvents[0].event_data.external_sync_units)).toBe(true);
  });

  test('should map board fields correctly to external sync unit format', async () => {
    // Arrange
    const event = testEnv.createExternalSyncUnitsStartEvent();

    // Act
    await testEnv.sendEventToSnapIn(event);

    // Assert
    const receivedEvents = await testEnv.waitForEvents(1, 15000);
    const externalSyncUnits = receivedEvents[0].event_data.external_sync_units;

    expect(externalSyncUnits.length).toBeGreaterThan(0);

    // Verify each external sync unit has the required fields
    externalSyncUnits.forEach((unit: any) => {
      expect(unit).toHaveProperty('id');
      expect(unit).toHaveProperty('name');
      expect(unit).toHaveProperty('description');
      expect(unit).toHaveProperty('item_type');
      
      expect(typeof unit.id).toBe('string');
      expect(typeof unit.name).toBe('string');
      expect(typeof unit.description).toBe('string');
      expect(unit.item_type).toBe('cards');
      
      expect(unit.id).toBeTruthy();
      expect(unit.name).toBeTruthy();
    });
  });

  test('should fetch real boards from Trello API and process them correctly', async () => {
    // Arrange
    const event = testEnv.createExternalSyncUnitsStartEvent();

    // Act
    await testEnv.sendEventToSnapIn(event);

    // Assert
    const receivedEvents = await testEnv.waitForEvents(1, 15000);
    const externalSyncUnits = receivedEvents[0].event_data.external_sync_units;

    // Verify that we got actual board data from Trello
    expect(externalSyncUnits.length).toBeGreaterThan(0);

    // Check that the mapping from board fields to external sync unit fields is correct
    const firstUnit = externalSyncUnits[0];
    
    // Verify the structure matches what we expect from Trello boards
    expect(firstUnit.id).toMatch(/^[a-f0-9]{24}$/); // Trello board IDs are 24-character hex strings
    expect(firstUnit.name).toBeTruthy();
    expect(typeof firstUnit.description).toBe('string'); // Can be empty string
    expect(firstUnit.item_type).toBe('cards');

    // Log the received data for debugging purposes
    console.log('Received external sync units:', JSON.stringify(externalSyncUnits, null, 2));
  });
});