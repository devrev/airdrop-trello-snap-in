import { FunctionInput, Context, ExecutionMetadata, InputData } from '../../core/types';
import { EventType } from '@devrev/ts-adaas';
import run from './index';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  spawn: jest.fn(),
}));

// Mock the convertToAirdropEvent function
jest.mock('../../core/utils', () => ({
  convertToAirdropEvent: jest.fn((event) => event),
}));

import { spawn } from '@devrev/ts-adaas';
import { convertToAirdropEvent } from '../../core/utils';

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockConvertToAirdropEvent = convertToAirdropEvent as jest.MockedFunction<typeof convertToAirdropEvent>;

describe('data_extraction_check function', () => {
  const createMockContext = (): Context => ({
    dev_oid: 'test-dev-oid',
    source_id: 'test-source-id',
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id',
    service_account_id: 'test-service-account-id',
    secrets: {
      service_account_token: 'test-token',
    },
  });

  const createMockExecutionMetadata = (): ExecutionMetadata => ({
    request_id: 'test-request-id',
    function_name: 'data_extraction_check',
    event_type: 'test-event',
    devrev_endpoint: 'https://api.devrev.ai/',
  });

  const createMockInputData = (): InputData => ({
    global_values: {},
    event_sources: {},
  });

  const createMockEvent = (eventType: string = EventType.ExtractionDataStart): FunctionInput => ({
    payload: { 
      event_type: eventType,
      connection_data: {},
      event_context: {},
    },
    context: createMockContext(),
    execution_metadata: createMockExecutionMetadata(),
    input_data: createMockInputData(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSpawn.mockResolvedValue(undefined);
    mockConvertToAirdropEvent.mockImplementation((event) => event as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should successfully handle EXTRACTION_DATA_START event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);
    const events = [mockEvent];

    await run(events);

    expect(mockConvertToAirdropEvent).toHaveBeenCalledWith(mockEvent);
    expect(mockSpawn).toHaveBeenCalledWith({
      event: mockEvent,
      workerPath: expect.stringContaining('/workers/data-extraction-check.ts'),
      initialState: {},
      initialDomainMapping: {},
    });
  });

  it('should successfully handle EXTRACTION_DATA_CONTINUE event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionDataContinue);
    const events = [mockEvent];

    await run(events);

    expect(mockConvertToAirdropEvent).toHaveBeenCalledWith(mockEvent);
    expect(mockSpawn).toHaveBeenCalledWith({
      event: mockEvent,
      workerPath: expect.stringContaining('/workers/data-extraction-check.ts'),
      initialState: {},
      initialDomainMapping: {},
    });
  });

  it('should throw error when events is not an array', async () => {
    await expect(run(null as any)).rejects.toThrow('Invalid input: events must be an array');
    await expect(run(undefined as any)).rejects.toThrow('Invalid input: events must be an array');
    await expect(run('not-array' as any)).rejects.toThrow('Invalid input: events must be an array');
  });

  it('should throw error when events array is empty', async () => {
    await expect(run([])).rejects.toThrow('Invalid input: events array cannot be empty');
  });

  it('should throw error when event is null or undefined', async () => {
    await expect(run([null as any])).rejects.toThrow('Invalid event: event cannot be null or undefined');
    await expect(run([undefined as any])).rejects.toThrow('Invalid event: event cannot be null or undefined');
  });

  it('should throw error when event is missing payload', async () => {
    const mockEvent = createMockEvent();
    const eventWithoutPayload = {
      ...mockEvent,
      payload: undefined,
    } as any;

    await expect(run([eventWithoutPayload])).rejects.toThrow('Invalid event: missing payload');
  });

  it('should throw error when event is missing event_type', async () => {
    const mockEvent = createMockEvent();
    const eventWithoutEventType = {
      ...mockEvent,
      payload: {
        ...mockEvent.payload,
        event_type: undefined,
      },
    } as any;

    await expect(run([eventWithoutEventType])).rejects.toThrow('Invalid event: missing event_type in payload');
  });

  it('should throw error for unsupported event type', async () => {
    const mockEvent = createMockEvent('UNSUPPORTED_EVENT_TYPE');
    const events = [mockEvent];

    await expect(run(events)).rejects.toThrow('Unsupported event type: UNSUPPORTED_EVENT_TYPE. Expected: EXTRACTION_DATA_START or EXTRACTION_DATA_CONTINUE');
  });

  it('should process only the first event when multiple events are provided', async () => {
    const mockEvent1 = createMockEvent(EventType.ExtractionDataStart);
    const mockEvent2 = createMockEvent(EventType.ExtractionDataContinue);
    mockEvent2.context.dev_oid = 'different-dev-oid';

    await run([mockEvent1, mockEvent2]);

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(mockConvertToAirdropEvent).toHaveBeenCalledWith(mockEvent1);
  });

  it('should log error details when validation fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    try {
      await run([]);
    } catch (error) {
      // Expected to throw
    }

    expect(consoleSpy).toHaveBeenCalledWith('Data extraction check function error:', {
      error_message: 'Invalid input: events array cannot be empty',
      error_stack: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should handle spawn errors gracefully', async () => {
    const spawnError = new Error('Spawn failed');
    mockSpawn.mockRejectedValue(spawnError);
    
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);
    const events = [mockEvent];

    await expect(run(events)).rejects.toThrow('Spawn failed');
  });

  it('should handle unknown errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    // Create a mock that will cause an unknown error
    const mockEvent = createMockEvent();
    Object.defineProperty(mockEvent, 'payload', {
      get: () => {
        throw 'string error'; // Non-Error object
      }
    });

    try {
      await run([mockEvent]);
    } catch (error) {
      // Expected to throw
    }

    expect(consoleSpy).toHaveBeenCalledWith('Data extraction check function error:', {
      error_message: 'Unknown error',
      error_stack: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should use correct worker path', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);
    const events = [mockEvent];

    await run(events);

    expect(mockSpawn).toHaveBeenCalledWith({
      event: mockEvent,
      workerPath: expect.stringMatching(/\/workers\/data-extraction-check\.ts$/),
      initialState: {},
      initialDomainMapping: {},
    });
  });
});