import { processTask, ExtractorEventType, NormalizedItem } from '@devrev/ts-adaas';

/**
 * Normalizes raw user data to the expected format
 */
function normalizeUser(rawUser: any): NormalizedItem {
  return {
    id: rawUser.id,
    created_date: rawUser.created_at || new Date().toISOString(),
    modified_date: rawUser.updated_at || new Date().toISOString(),
    data: {
      name: rawUser.name || null,
      email: rawUser.email || null,
      status: rawUser.status || null,
      role: rawUser.role || null,
    },
  };
}

/**
 * Worker for testing data extraction workflow.
 * Initializes users repo, normalizes and pushes user data, then emits EXTRACTION_DATA_DONE.
 */
processTask({
  task: async ({ adapter }) => {
    try {
      // Initialize repos with users repo and normalization function
      const repos = [
        {
          itemType: 'users',
          normalize: normalizeUser,
        },
      ];

      adapter.initializeRepos(repos);

      // Create mock user data for testing
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          status: 'active',
          role: 'developer',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          status: 'active',
          role: 'manager',
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
        {
          id: 'user-3',
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          status: 'inactive',
          role: 'tester',
          created_at: '2023-01-03T00:00:00Z',
          updated_at: '2023-01-03T00:00:00Z',
        },
      ];

      // Push users to the repository
      await adapter.getRepo('users')?.push(mockUsers);

      // Upload any remaining users that didn't trigger automatic batch upload
      await adapter.getRepo('users')?.upload();

      // Emit the EXTRACTION_DATA_DONE event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
    } catch (error) {
      console.error('Data extraction check worker error:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Emit error event if something goes wrong
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred in data extraction check',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    try {
      console.error('Data extraction check worker timeout');
      
      // Emit progress event on timeout as per requirements
      await adapter.emit(ExtractorEventType.ExtractionDataProgress);
    } catch (error) {
      console.error('Error handling timeout in data extraction check worker:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  },
});