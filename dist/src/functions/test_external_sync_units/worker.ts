import { processTask, ExtractorEventType, ExternalSyncUnit } from '@devrev/ts-adaas';

// Define the state type for the worker
type WorkerState = Record<string, unknown>;

// Process the external sync units extraction task
processTask({
  task: async ({ adapter }) => {
    try {
      // Create sample external sync units
      const externalSyncUnits: ExternalSyncUnit[] = [
        {
          id: 'test-unit-1',
          name: 'Test Unit 1',
          description: 'This is a test external sync unit 1',
          item_count: 100,
          item_type: 'test_items'
        },
        {
          id: 'test-unit-2',
          name: 'Test Unit 2',
          description: 'This is a test external sync unit 2',
          item_count: 200,
          item_type: 'test_items'
        }
      ];

      // Emit the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event with the external sync units
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
    } catch (error) {
      console.error('Error in external sync units extraction worker:', error);
      
      // Emit an error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: `Failed to extract external sync units: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout by emitting an error event
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
  },
});