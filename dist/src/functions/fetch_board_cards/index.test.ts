// Mock the TrelloClient module before importing
jest.mock('../../core/trello-client');

import run from './index';
import { TrelloClient } from '../../core/trello-client';
import {
  setupMockTrelloClient,
  createMockEvent,
  setupConsoleSpies,
  clearAllMocks,
  expectSuccessResponse,
  expectFailureResponse,
} from './test-setup';
import {
  successfulBoardCardsResponse,
  authFailureResponse,
  rateLimitResponse,
  notFoundResponse,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
  mockBoardCardsData,
  transformCardsForExpectation,
} from './test-data';
import {
  createBoardCardsTestScenarios,
  validateSuccessResponseStructure,
  validateFailureResponseStructure,
  createPaginationTestScenarios,
} from './test-helpers';
import {
  runComprehensiveErrorTests,
  runIntegrationTests,
  runEdgeCaseTests,
} from './test-comprehensive';

describe('fetch_board_cards function', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
    mockTrelloClientInstance = setupMockTrelloClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with board cards data', async () => {
    mockTrelloClientInstance.getBoardCards.mockResolvedValue(successfulBoardCardsResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    const expectedCards = transformCardsForExpectation(mockBoardCardsData);
    expectSuccessResponse(result, expectedCards);
  });

  it('should return failure response for invalid authentication', async () => {
    mockTrelloClientInstance.getBoardCards.mockResolvedValue(authFailureResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 401, 'Authentication failed - invalid API key or token');
  });

  it('should handle rate limiting correctly', async () => {
    mockTrelloClientInstance.getBoardCards.mockResolvedValue(rateLimitResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 429, 'Rate limit exceeded - retry after 60 seconds', 60);
  });

  it('should handle board not found error', async () => {
    mockTrelloClientInstance.getBoardCards.mockResolvedValue(notFoundResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 404, 'Board not found');
  });

  describe('board cards response scenarios', () => {
    const scenarios = createBoardCardsTestScenarios();

    it(scenarios.emptyCards.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(scenarios.emptyCards.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectSuccessResponse(result, scenarios.emptyCards.expectedCards);
    });

    it(scenarios.customCard.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(scenarios.customCard.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateSuccessResponseStructure(result);
      expect(result.cards).toHaveLength(1);
      expect(result.cards![0]).toEqual(scenarios.customCard.expectedCard);
    });

    it(scenarios.serverError.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(scenarios.serverError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 500, 'Trello API server error');
    });

    it(scenarios.notFoundError.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(scenarios.notFoundError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 404, 'Board not found');
    });

    it(scenarios.successWithoutData.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(scenarios.successWithoutData.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, 'Success but no data');
    });
  });

  describe('pagination scenarios', () => {
    const paginationScenarios = createPaginationTestScenarios();

    it(paginationScenarios.withBefore.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(successfulBoardCardsResponse);

      const mockEvent = paginationScenarios.withBefore.createEvent();
      const result = await run([mockEvent]);

      expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledWith(
        'board-123',
        paginationScenarios.withBefore.expectedParams.limit,
        paginationScenarios.withBefore.expectedParams.before
      );
      expectSuccessResponse(result);
    });

    it(paginationScenarios.withoutBefore.description, async () => {
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(successfulBoardCardsResponse);

      const mockEvent = paginationScenarios.withoutBefore.createEvent();
      const result = await run([mockEvent]);

      expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledWith(
        'board-123',
        paginationScenarios.withoutBefore.expectedParams.limit,
        paginationScenarios.withoutBefore.expectedParams.before
      );
      expectSuccessResponse(result);
    });

    it(paginationScenarios.invalidLimit.description, async () => {
      const mockEvent = paginationScenarios.invalidLimit.createEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, paginationScenarios.invalidLimit.expectedError);
    });

    it(paginationScenarios.zeroLimit.description, async () => {
      const mockEvent = paginationScenarios.zeroLimit.createEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, paginationScenarios.zeroLimit.expectedError);
    });

    it(paginationScenarios.negativeLimit.description, async () => {
      const mockEvent = paginationScenarios.negativeLimit.createEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, paginationScenarios.negativeLimit.expectedError);
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

  // Run comprehensive test suites
  runComprehensiveErrorTests(run, () => mockTrelloClientInstance);
  runIntegrationTests(run, () => mockTrelloClientInstance);
  runEdgeCaseTests(run, () => mockTrelloClientInstance);
});