import { processTask, ExtractorEventType } from '@devrev/ts-adaas';

/**
 * Worker for testing external sync units extraction.
 * Emits EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event as required.
 */
processTask({
  task: async ({ adapter }) => {
    try {
      // Create test external sync units data
      const externalSyncUnits = [
        {
          id: 'test-sync-unit-1',
          name: 'Test Sync Unit 1',
          description: 'Test external sync unit for validation',
          item_count: 100,
        },
        {
          id: 'test-sync-unit-2', 
          name: 'Test Sync Unit 2',
          description: 'Another test external sync unit',
          item_count: 50,
        },
      ];

      // Emit the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event with test data
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
    } catch (error) {
      console.error('External sync units test worker error:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Emit error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred in external sync units test',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    try {
      console.error('External sync units test worker timeout');
      
      // Emit error event on timeout
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units. Lambda timeout.',
        },
      });
    } catch (error) {
      console.error('Error handling timeout in external sync units test worker:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  },
});