import { processTask, ExtractorEventType, ExternalSyncUnit } from '@devrev/ts-adaas';

// Define the state type for this worker
type WorkerState = Record<string, unknown>;

// Process the external sync units extraction task
processTask({
  task: async ({ adapter }) => {
    console.log('Worker file loaded successfully');
    console.log('Processing external sync units extraction task');

    // Create sample external sync units
    const externalSyncUnits: ExternalSyncUnit[] = [
      {
        id: 'test-unit-1',
        name: 'Test Unit 1',
        description: 'First test external sync unit',
        item_count: 100,
      },
      {
        id: 'test-unit-2',
        name: 'Test Unit 2',
        description: 'Second test external sync unit',
        item_count: 250,
      },
    ];

    // Emit the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event with the sample units
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
      external_sync_units: externalSyncUnits,
    });

    console.log('External sync units extraction task completed successfully');
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout by emitting an error event
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
    console.error('External sync units extraction task timed out');
  },
});