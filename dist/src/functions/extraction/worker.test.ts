import { SyncMode, EventType, processTask } from '@devrev/ts-adaas';

// Mock the extractors module to avoid actual API calls
jest.mock('./extractors', () => ({
  handleDataExtraction: jest.fn().mockResolvedValue(undefined),
  handleExternalSyncUnitsExtraction: jest.fn().mockResolvedValue(undefined),
  handleMetadataExtraction: jest.fn().mockResolvedValue(undefined),
  handleAttachmentsExtraction: jest.fn().mockResolvedValue(() => Promise.resolve({ httpStream: {} })),
}));

// Mock the ts-adaas processTask function
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  processTask: jest.fn(),
}));

describe('extraction worker incremental mode', () => {
  let mockAdapter: any;
  let taskFunction: any;
  let onTimeoutFunction: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAdapter = {
      event: {
        payload: {
          event_type: EventType.ExtractionDataStart,
          event_context: {
            mode: SyncMode.INITIAL,
          },
        },
      },
      state: {
        users: { completed: false },
        cards: { completed: false },
        attachments: { completed: false },
        lastSuccessfulSyncStarted: '2023-01-01T00:00:00Z',
      },
      emit: jest.fn(),
    };

    // Import the worker file to trigger processTask call
    require('./worker');
    
    // Extract the task and onTimeout functions from the processTask mock
    const processTaskCalls = (processTask as jest.Mock).mock.calls;
    if (processTaskCalls.length > 0) {
      const config = processTaskCalls[processTaskCalls.length - 1][0];
      taskFunction = config.task;
      onTimeoutFunction = config.onTimeout;
    }
  });

  it('should set incremental mode state when mode is INCREMENTAL and event is EXTRACTION_DATA_START', async () => {
    // Set up incremental mode
    mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;

    // Execute the task function
    await taskFunction({ adapter: mockAdapter });

    // Verify that incremental mode state was set correctly
    expect(mockAdapter.state.cards).toEqual({
      completed: false,
      modifiedSince: '2023-01-01T00:00:00Z',
    });
    expect(mockAdapter.state.attachments).toEqual({
      completed: false,
    });
  });

  it('should not modify state when mode is INITIAL', async () => {
    // Keep mode as INITIAL
    mockAdapter.event.payload.event_context.mode = SyncMode.INITIAL;
    
    // Store original state
    const originalCardsState = { ...mockAdapter.state.cards };
    const originalAttachmentsState = { ...mockAdapter.state.attachments };

    // Execute the task function
    await taskFunction({ adapter: mockAdapter });

    // Verify that state was not modified for incremental mode
    expect(mockAdapter.state.cards).toEqual(originalCardsState);
    expect(mockAdapter.state.attachments).toEqual(originalAttachmentsState);
  });

  it('should not modify state when event is EXTRACTION_DATA_CONTINUE even in incremental mode', async () => {
    // Set up incremental mode but with CONTINUE event
    mockAdapter.event.payload.event_type = EventType.ExtractionDataContinue;
    mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
    
    // Store original state
    const originalCardsState = { ...mockAdapter.state.cards };
    const originalAttachmentsState = { ...mockAdapter.state.attachments };

    // Execute the task function
    await taskFunction({ adapter: mockAdapter });

    // Verify that state was not modified for CONTINUE event
    expect(mockAdapter.state.cards).toEqual(originalCardsState);
    expect(mockAdapter.state.attachments).toEqual(originalAttachmentsState);
  });
});