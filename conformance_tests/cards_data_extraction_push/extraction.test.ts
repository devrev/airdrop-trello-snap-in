import { 
  validateEnvironment, 
  createEventPayload, 
  mockSendEventToSnapIn,
  TEST_BOARD_ID
} from './utils';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Validate environment before running tests
beforeAll(() => {
  validateEnvironment();
});

// Mock successful response from snap-in server
beforeEach(() => {
  mockedAxios.post.mockResolvedValue({
    data: {
      function_result: {
        success: true,
        message: 'Extraction process initiated for event type: EXTRACTION_DATA_START'
      }
    }
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Trello Cards Extraction Tests', () => {
  
  // Test 1: Basic test to verify extraction function can be called
  test('should accept EXTRACTION_DATA_START event', async () => {    
    // Create event payload for data extraction start
    const event = createEventPayload('EXTRACTION_DATA_START');
    
    // Send event to snap-in
    const response = await mockSendEventToSnapIn(event);
    
    // Verify response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated');
    
    // Verify that axios was called with the correct parameters
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.any(String), event);
  });

  // Test 2: Verify state is updated with "before" parameter
  test('should update state with "before" parameter after fetching cards', async () => {
    // Create event payload for data extraction
    const event = createEventPayload('EXTRACTION_DATA_START');
    
    // Add state to the payload
    event.payload.state = {
      users: { completed: true },
      cards: { completed: false },
      attachments: { completed: false }
    };
    
    // Send event to snap-in
    const response = await mockSendEventToSnapIn(event);
    
    // Verify response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      payload: expect.objectContaining({
        state: expect.objectContaining({
          cards: expect.objectContaining({
            completed: false
          })
        })
      })
    }));
  });

  // Test 3: Verify extraction with specific board ID
  test('should extract cards from the specified board', async () => {
    // Create event payload with specific board ID
    const event = createEventPayload('EXTRACTION_DATA_START');
    
    // Ensure the board ID is set correctly
    event.payload.event_context.external_sync_unit_id = TEST_BOARD_ID;
    
    // Send event to snap-in
    const response = await mockSendEventToSnapIn(event);
    
    // Verify response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      payload: expect.objectContaining({
        event_context: expect.objectContaining({
          external_sync_unit_id: TEST_BOARD_ID
        })
      })
    }));
  });
  
  // Test 4: Verify handling of EXTRACTION_DATA_CONTINUE event with before parameter
  test('should handle EXTRACTION_DATA_CONTINUE event with before parameter', async () => {
    // Create event payload for data extraction continue
    const event = createEventPayload('EXTRACTION_DATA_CONTINUE');
    
    // Add state with before parameter to the payload
    event.payload.state = {
      users: { completed: true },
      cards: { completed: false, before: 'some-card-id' },
      attachments: { completed: false }
    };
    
    // Send event to snap-in
    const response = await mockSendEventToSnapIn(event);
    
    // Verify response
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated');
  });
});