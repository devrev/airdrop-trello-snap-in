import { ExtractorEventType, processTask } from '@devrev/ts-adaas';

/**
 * State interface for the data extraction process
 */
interface DataExtractionState {
  completed: boolean;
  error?: string;
}

/**
 * Worker file for handling data extraction
 */
processTask<DataExtractionState>({
  task: async ({ adapter }) => {
    try {
      console.log('Starting data extraction test');
      
      // Initialize sample repositories for testing
      const repos = [
        {
          itemType: 'test_items',
          normalize: (item: any) => ({
            id: item.id,
            created_date: item.created_at,
            modified_date: item.updated_at,
            data: item
          })
        }
      ];
      
      adapter.initializeRepos(repos);
      
      // Create sample test items
      const testItems = Array.from({ length: 10 }, (_, i) => ({
        id: `test-item-${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        name: `Test Item ${i}`,
        description: `This is test item ${i}`,
        status: 'active'
      }));
      
      // Push items to the repository
      await adapter.getRepo('test_items')?.push(testItems);
      
      // Update state to indicate completion
      adapter.state.completed = true;
      
      // Emit the data extraction done event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
      
      console.log('Data extraction test completed successfully');
    } catch (error) {
      console.error('Error in data extraction test:', error);
      
      // Update state to indicate error
      adapter.state.completed = false;
      adapter.state.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during data extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Data extraction test timed out');
    
    // Update state to indicate timeout
    adapter.state.completed = false;
    adapter.state.error = 'Data extraction test timed out';
    
    // Emit error event on timeout
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Data extraction test timed out',
      },
    });
  },
});