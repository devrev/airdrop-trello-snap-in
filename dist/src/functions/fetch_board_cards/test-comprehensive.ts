import { TrelloClient } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';
import { FetchBoardCardsResponse } from './index';
import { 
  createMockEvent, 
  mockFromConnectionData, 
  expectSuccessResponse, 
  expectFailureResponse,
} from './test-setup';
import { successfulBoardCardsResponse } from './test-data';
import { validateSuccessResponseStructure, validateFailureResponseStructure } from './test-helpers';

/**
 * Comprehensive test scenarios for fetch_board_cards function
 */

export const runComprehensiveErrorTests = (
  run: (events: FunctionInput[]) => Promise<FetchBoardCardsResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('comprehensive error handling', () => {
    it('should handle TrelloClient creation errors', async () => {
      jest.spyOn(TrelloClient, 'fromConnectionData').mockImplementation(() => {
        throw new Error('Invalid connection data format');
      });

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, 'Invalid connection data format');
    });

    it('should handle API call errors', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getBoardCards.mockRejectedValue(new Error('Network error'));

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, 'Network error');
    });

    it('should handle unknown errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      const mockEvent = createMockEvent();
      Object.defineProperty(mockEvent, 'payload', {
        get: () => {
          throw 'string error'; // Non-Error object
        }
      });

      const result = await run([mockEvent]);

      expectFailureResponse(result, 500, 'Unknown error occurred during board cards fetching');
      expect(consoleSpy).toHaveBeenCalledWith('Fetch board cards function error:', {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      });
    });
  });
};

export const runIntegrationTests = (
  run: (events: FunctionInput[]) => Promise<FetchBoardCardsResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('integration scenarios', () => {
    it('should process only the first event when multiple events are provided', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(successfulBoardCardsResponse);

      const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'board-1', '5');
      const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'board-2', '10');

      const result = await run([mockEvent1, mockEvent2]);

      expect(mockFromConnectionData()).toHaveBeenCalledTimes(1);
      expect(mockFromConnectionData()).toHaveBeenCalledWith('key=api-key-1&token=token-1');
      expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledWith('board-1', 5, undefined);
      expectSuccessResponse(result);
    });

    it('should log error details when errors occur', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      const result = await run([]);

      expect(consoleSpy).toHaveBeenCalledWith('Fetch board cards function error:', {
        error_message: 'Invalid input: events array cannot be empty',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should create TrelloClient with correct connection data and call API with correct parameters', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getBoardCards.mockResolvedValue(successfulBoardCardsResponse);

      const connectionKey = 'key=my-api-key&token=my-oauth-token';
      const boardId = 'my-board-id';
      const limit = '25';
      const before = 'card-before-id';
      const mockEvent = createMockEvent(connectionKey, boardId, limit, before);
      
      await run([mockEvent]);

      expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
      expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledWith(boardId, 25, before);
      expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledTimes(1);
    });
  });
};

export const runEdgeCaseTests = (
  run: (events: FunctionInput[]) => Promise<FetchBoardCardsResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('edge cases', () => {
    it('should handle cards with missing optional properties', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      const cardsWithMissingProps = [
        {
          id: 'card-1',
          name: 'Card 1',
          closed: false,
          // missing desc and dateLastActivity
        },
        {
          id: 'card-2',
          name: 'Card 2',
          closed: true,
          desc: 'Card description',
          // missing dateLastActivity
        },
      ];

      mockTrelloClientInstance.getBoardCards.mockResolvedValue({
        data: cardsWithMissingProps,
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved board cards',
      });

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateSuccessResponseStructure(result);
      expect(result.cards).toHaveLength(2);
      expect(result.cards![0]).toEqual({
        id: 'card-1',
        name: 'Card 1',
        closed: false,
        date_last_activity: undefined,
      });
      expect(result.cards![1]).toEqual({
        id: 'card-2',
        name: 'Card 2',
        closed: true,
        desc: 'Card description',
        date_last_activity: undefined,
      });
    });
  });
};