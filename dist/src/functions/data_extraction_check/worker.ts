import { processTask, ExtractorEventType } from '@devrev/ts-adaas';
import { normalizeUser } from './normalize';

// Define the state type for the worker
type ExtractorState = {
  users: {
    completed: boolean;
  };
};

// Process the data extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    try {
      // Initialize the users repository
      const repos = [
        {
          itemType: 'users',
          normalize: normalizeUser,
        },
      ];
      
      adapter.initializeRepos(repos);

      // Create sample user data
      const users = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          role: 'admin',
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          created_at: '2023-01-03T00:00:00Z',
          updated_at: '2023-01-04T00:00:00Z',
          role: 'user',
        },
      ];

      // Push the users to the repository
      await adapter.getRepo('users')?.push(users);

      // Update the state to mark users as completed
      adapter.state.users.completed = true;

      // Emit the EXTRACTION_DATA_DONE event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
    } catch (error) {
      console.error('Error in data extraction worker:', error);
      
      // Emit an error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: `Failed to extract data: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout by emitting a progress event
    await adapter.emit(ExtractorEventType.ExtractionDataProgress);
  },
});