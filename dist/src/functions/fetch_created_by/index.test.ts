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
  successfulCardActionsResponse,
  authFailureResponse,
  rateLimitResponse,
  notFoundResponse,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
  mockCardActionsData,
} from './test-data';
import {
  createCardActionsTestScenarios,
  createMultipleEventsTestCase,
  createErrorTestScenarios,
  validateSuccessResponseStructure,
  validateFailureResponseStructure,
} from './test-helpers';
import { runAllComprehensiveTests } from './test-comprehensive-main';

describe('fetch_created_by function', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
    mockTrelloClientInstance = setupMockTrelloClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with creator ID', async () => {
    mockTrelloClientInstance.getCardActions.mockResolvedValue(successfulCardActionsResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectSuccessResponse(result, mockCardActionsData[0].idMemberCreator);
    expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledWith('test-card-id', 'createCard', 'idMemberCreator');
  });

  it('should return failure response for invalid authentication', async () => {
    mockTrelloClientInstance.getCardActions.mockResolvedValue(authFailureResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 401, 'Authentication failed - invalid API key or token');
  });

  it('should handle rate limiting correctly', async () => {
    mockTrelloClientInstance.getCardActions.mockResolvedValue(rateLimitResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 429, 'Rate limit exceeded - retry after 60 seconds', 60);
  });

  it('should handle card not found error', async () => {
    mockTrelloClientInstance.getCardActions.mockResolvedValue(notFoundResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 404, 'Card not found');
  });

  describe('card actions response scenarios', () => {
    const scenarios = createCardActionsTestScenarios();

    it(scenarios.emptyActions.description, async () => {
      mockTrelloClientInstance.getCardActions.mockResolvedValue(scenarios.emptyActions.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, scenarios.emptyActions.expectedMessage);
    });

    it(scenarios.missingCreatorId.description, async () => {
      mockTrelloClientInstance.getCardActions.mockResolvedValue(scenarios.missingCreatorId.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, scenarios.missingCreatorId.expectedMessage);
    });

    it(scenarios.customAction.description, async () => {
      mockTrelloClientInstance.getCardActions.mockResolvedValue(scenarios.customAction.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateSuccessResponseStructure(result);
      expect(result.creator_id).toBe(scenarios.customAction.expectedCreatorId);
    });

    it(scenarios.serverError.description, async () => {
      mockTrelloClientInstance.getCardActions.mockResolvedValue(scenarios.serverError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 500, 'Trello API server error');
    });

    it(scenarios.notFoundError.description, async () => {
      mockTrelloClientInstance.getCardActions.mockResolvedValue(scenarios.notFoundError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 404, 'Card not found');
    });

    it(scenarios.successWithoutData.description, async () => {
      mockTrelloClientInstance.getCardActions.mockResolvedValue(scenarios.successWithoutData.mockResponse);

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
      expect(consoleSpy).toHaveBeenCalledWith('Fetch created by function error:', errorScenarios.unknownError.expectedConsoleLog);
    });
  });

  it('should process only the first event when multiple events are provided', async () => {
    mockTrelloClientInstance.getCardActions.mockResolvedValue(successfulCardActionsResponse);

    const testCase = createMultipleEventsTestCase();
    const result = await run(testCase.events);

    expect(mockFromConnectionData()).toHaveBeenCalledTimes(1);
    expect(mockFromConnectionData()).toHaveBeenCalledWith(testCase.expectedConnectionData);
    expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledWith(testCase.expectedCardId, 'createCard', 'idMemberCreator');
    expectSuccessResponse(result);
  });

  it('should log error details when errors occur', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const result = await run([]);

    expect(consoleSpy).toHaveBeenCalledWith('Fetch created by function error:', {
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

    expectFailureResponse(result, 500, 'Unknown error occurred during card creator fetching');
    expect(consoleSpy).toHaveBeenCalledWith('Fetch created by function error:', {
      error_message: 'Unknown error',
      error_stack: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should create TrelloClient with correct connection data and call API with correct parameters', async () => {
    mockTrelloClientInstance.getCardActions.mockResolvedValue(successfulCardActionsResponse);

    const connectionKey = 'key=my-api-key&token=my-oauth-token';
    const cardId = 'my-card-id';
    const mockEvent = createMockEvent(connectionKey, cardId);
    
    await run([mockEvent]);

    expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
    expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledWith(cardId, 'createCard', 'idMemberCreator');
    expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledTimes(1);
  });

  // Run comprehensive test suites
  runAllComprehensiveTests(run, () => mockTrelloClientInstance);
});