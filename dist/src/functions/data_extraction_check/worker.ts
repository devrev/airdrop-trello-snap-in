import { processTask, ExtractorEventType, NormalizedItem, RepoInterface } from '@devrev/ts-adaas';

// Define the state type for this worker
type ExtractorState = {
  users: {
    completed: boolean;
  };
};

// Sample user data
const sampleUsers = [
  {
    id: 'user1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-05-20T14:45:00Z',
    role: 'admin'
  },
  {
    id: 'user2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    created_at: '2023-02-10T09:15:00Z',
    updated_at: '2023-06-05T11:20:00Z',
    role: 'user'
  },
  {
    id: 'user3',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    created_at: '2023-03-22T16:40:00Z',
    updated_at: '2023-07-12T08:30:00Z',
    role: 'user'
  }
];

// Normalization function for users
const normalizeUser = (user: any): NormalizedItem => {
  return {
    id: user.id,
    created_date: user.created_at,
    modified_date: user.updated_at,
    data: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

// Process the data extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Worker file loaded successfully');
    console.log('Processing data extraction task');

    // Initialize users state if it doesn't exist
    if (!adapter.state.users) {
      adapter.state = {
        ...adapter.state,
        users: { completed: false }
      };
    }
    if (adapter.state.users.completed) {
      console.log('Users already processed, skipping');
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
      return;
    }

    // Define the repository for users
    const repos: RepoInterface[] = [
      {
        itemType: 'users',
        normalize: normalizeUser,
      }
    ];

    // Initialize the repositories
    adapter.initializeRepos(repos);

    try {
      // Push the sample users to the repository
      const usersRepo = adapter.getRepo('users');
      if (usersRepo) {
        await usersRepo.push(sampleUsers);
        console.log('Successfully pushed users data');
        
        // Update state to mark users as completed
        adapter.state = {
          ...adapter.state,
          users: { completed: true }
        };
        
        // Emit the EXTRACTION_DATA_DONE event
        await adapter.emit(ExtractorEventType.ExtractionDataDone);
        console.log('Data extraction task completed successfully');
      } else {
        throw new Error('Users repository not found');
      }
    } catch (error) {
      console.error('Error during data extraction:', error);
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error during data extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout by emitting a progress event
    await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
      progress: 50, // Estimate of progress percentage
    });
    console.log('Data extraction task timed out, emitting progress event');
  },
});