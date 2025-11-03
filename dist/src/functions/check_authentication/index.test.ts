// Mock the TrelloClient module before importing
jest.mock('../../core/trello-client');

import run from './index';
import { TrelloClient } from '../../core/trello-client';
import {
  setupMockTrelloClient,
  createMockEvent,
  successfulMemberResponse,
  authFailureResponse,
  rateLimitResponse,
  setupConsoleSpies,
  clearAllMocks,
  mockFromConnectionData,
  expectSuccessResponse,
  expectFailureResponse,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
} from './test-setup';

describe('check_authentication function', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
    mockTrelloClientInstance = setupMockTrelloClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response for valid authentication', async () => {
    mockTrelloClientInstance.getCurrentMember.mockResolvedValue(successfulMemberResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectSuccessResponse(result, {
      id: 'member-123',
      username: 'testuser',
      full_name: 'Test User',
    });
  });

  it('should return failure response for invalid authentication', async () => {
    mockTrelloClientInstance.getCurrentMember.mockResolvedValue(authFailureResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 401, 'Authentication failed - invalid API key or token');
  });

  it('should handle rate limiting correctly', async () => {
    mockTrelloClientInstance.getCurrentMember.mockResolvedValue(rateLimitResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 429, 'Rate limit exceeded - retry after 60 seconds', 60);
  });

  describe('input validation', () => {
    const testCases = createInvalidInputTestCases();
    
    testCases.forEach(({ input, expectedMessage }) => {
      it(`should handle invalid input: ${JSON.stringify(input)}`, async () => {
        const result = await run(input as any);
        expectFailureResponse(result, 500, expectedMessage);
      });
    });
  });

  describe('event validation', () => {
    const testCases = createInvalidEventTestCases();
    
    testCases.forEach(({ name, eventModifier, expectedMessage }) => {
      it(`should handle ${name}`, async () => {
        const mockEvent = createMockEvent();
        const invalidEvent = eventModifier(mockEvent);
        const result = await run([invalidEvent as any]);
        expectFailureResponse(result, 500, expectedMessage);
      });
    });
  });

  it('should handle TrelloClient creation errors', async () => {
    jest.spyOn(TrelloClient, 'fromConnectionData').mockImplementation(() => {
      throw new Error('Invalid connection data format');
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 500, 'Invalid connection data format');
  });

  it('should handle API call errors', async () => {
    mockTrelloClientInstance.getCurrentMember.mockRejectedValue(new Error('Network error'));

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 500, 'Network error');
  });

  it('should process only the first event when multiple events are provided', async () => {
    mockTrelloClientInstance.getCurrentMember.mockResolvedValue(successfulMemberResponse);

    const mockEvent1 = createMockEvent('key=api-key-1&token=token-1');
    const mockEvent2 = createMockEvent('key=api-key-2&token=token-2');

    const result = await run([mockEvent1, mockEvent2]);

    expect(mockFromConnectionData()).toHaveBeenCalledTimes(1);
    expect(mockFromConnectionData()).toHaveBeenCalledWith('key=api-key-1&token=token-1');
    expectSuccessResponse(result);
  });

  it('should log error details when errors occur', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const result = await run([]);

    expect(consoleSpy).toHaveBeenCalledWith('Authentication check function error:', {
      error_message: 'Invalid input: events array cannot be empty',
      error_stack: expect.any(String),
      timestamp: expect.any(String),
    });
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

    const result = await run([mockEvent]);

    expectFailureResponse(result, 500, 'Unknown error occurred during authentication check');
    expect(consoleSpy).toHaveBeenCalledWith('Authentication check function error:', {
      error_message: 'Unknown error',
      error_stack: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should handle successful response without member data', async () => {
    mockTrelloClientInstance.getCurrentMember.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success but no data',
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 200, 'Success but no data');
  });

  it('should create TrelloClient with correct connection data', async () => {
    mockTrelloClientInstance.getCurrentMember.mockResolvedValue(successfulMemberResponse);

    const connectionKey = 'key=my-api-key&token=my-oauth-token';
    const mockEvent = createMockEvent(connectionKey);
    
    await run([mockEvent]);

    expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
    expect(mockTrelloClientInstance.getCurrentMember).toHaveBeenCalledTimes(1);
  });
});