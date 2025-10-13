// Mock the TrelloClient module before importing
jest.mock('../../core/trello-client');

import run from './index';
import { TrelloClient } from '../../core/trello-client';
import {
  setupMockTrelloClient,
  createMockEvent,
  setupConsoleSpies,
  clearAllMocks,
  mockFromConnectionData,
  expectSuccessResponse,
  expectFailureResponse,
} from './test-setup';
import {
  successfulBoardsResponse,
  authFailureResponse,
  rateLimitResponse,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
  mockBoardsData,
  transformBoardsForExpectation,
} from './test-data';
import {
  createBoardTestScenarios,
  createMultipleEventsTestCase,
  createErrorTestScenarios,
  validateSuccessResponseStructure,
  validateFailureResponseStructure,
} from './test-helpers';

describe('fetch_boards function', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
    mockTrelloClientInstance = setupMockTrelloClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with boards data', async () => {
    mockTrelloClientInstance.getMemberBoards.mockResolvedValue(successfulBoardsResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    const expectedBoards = transformBoardsForExpectation(mockBoardsData);
    expectSuccessResponse(result, expectedBoards);
  });

  it('should return failure response for invalid authentication', async () => {
    mockTrelloClientInstance.getMemberBoards.mockResolvedValue(authFailureResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 401, 'Authentication failed - invalid API key or token');
  });

  it('should handle rate limiting correctly', async () => {
    mockTrelloClientInstance.getMemberBoards.mockResolvedValue(rateLimitResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 429, 'Rate limit exceeded - retry after 60 seconds', 60);
  });

  describe('board response scenarios', () => {
    const scenarios = createBoardTestScenarios();

    it(scenarios.emptyBoards.description, async () => {
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(scenarios.emptyBoards.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectSuccessResponse(result, scenarios.emptyBoards.expectedBoards);
    });

    it(scenarios.customBoard.description, async () => {
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(scenarios.customBoard.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateSuccessResponseStructure(result);
      expect(result.boards).toHaveLength(1);
      expect(result.boards![0]).toEqual(scenarios.customBoard.expectedBoard);
    });

    it(scenarios.serverError.description, async () => {
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(scenarios.serverError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 500, 'Trello API server error');
    });

    it(scenarios.successWithoutData.description, async () => {
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(scenarios.successWithoutData.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, 'Success but no data');
    });
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

  describe('error handling', () => {
    const errorScenarios = createErrorTestScenarios();

    it(errorScenarios.clientCreationError.description, async () => {
      errorScenarios.clientCreationError.setupMock(TrelloClient);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, errorScenarios.clientCreationError.errorMessage);
    });

    it(errorScenarios.apiCallError.description, async () => {
      errorScenarios.apiCallError.setupMock(mockTrelloClientInstance);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, errorScenarios.apiCallError.errorMessage);
    });

    it(errorScenarios.unknownError.description, async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      const mockEvent = errorScenarios.unknownError.createEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, errorScenarios.unknownError.errorMessage);
      expect(consoleSpy).toHaveBeenCalledWith('Fetch boards function error:', errorScenarios.unknownError.expectedConsoleLog);
    });
  });

  it('should process only the first event when multiple events are provided', async () => {
    mockTrelloClientInstance.getMemberBoards.mockResolvedValue(successfulBoardsResponse);

    const testCase = createMultipleEventsTestCase();
    const result = await run(testCase.events);

    expect(mockFromConnectionData()).toHaveBeenCalledTimes(1);
    expect(mockFromConnectionData()).toHaveBeenCalledWith(testCase.expectedConnectionData);
    expectSuccessResponse(result);
  });

  it('should log error details when errors occur', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const result = await run([]);

    expect(consoleSpy).toHaveBeenCalledWith('Fetch boards function error:', {
      error_message: 'Invalid input: events array cannot be empty',
      error_stack: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should create TrelloClient with correct connection data', async () => {
    mockTrelloClientInstance.getMemberBoards.mockResolvedValue(successfulBoardsResponse);

    const connectionKey = 'key=my-api-key&token=my-oauth-token';
    const mockEvent = createMockEvent(connectionKey);
    
    await run([mockEvent]);

    expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
    expect(mockTrelloClientInstance.getMemberBoards).toHaveBeenCalledTimes(1);
  });
});