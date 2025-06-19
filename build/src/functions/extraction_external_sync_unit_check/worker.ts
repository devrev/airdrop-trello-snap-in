import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';

/**
 * Worker file for handling external sync units extraction
 */
processTask({
  task: async ({ adapter }) => {
    try {
      console.log('Starting external sync units extraction test');
      
      // Create sample external sync units for testing
      const externalSyncUnits: ExternalSyncUnit[] = [
        {
          id: 'test-sync-unit-1',
          name: 'Test Sync Unit 1',
          description: 'This is a test sync unit 1',
          item_count: 10,
          item_type: 'test_items'
        },
        {
          id: 'test-sync-unit-2',
          name: 'Test Sync Unit 2',
          description: 'This is a test sync unit 2',
          item_count: 20,
          item_type: 'test_items'
        }
      ];

      // Emit the external sync units done event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
      
      console.log('External sync units extraction test completed successfully');
    } catch (error) {
      console.error('Error in external sync units extraction test:', error);
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during external sync units extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('External sync units extraction test timed out');
    
    // Emit error event on timeout
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'External sync units extraction test timed out',
      },
    });
  },
});