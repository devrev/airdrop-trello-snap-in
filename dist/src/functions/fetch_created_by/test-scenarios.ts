import { TrelloClient } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';
import { FetchCreatedByResponse } from './index';
import { 
  createMockEvent, 
  mockFromConnectionData, 
  expectSuccessResponse, 
  expectFailureResponse,
} from './test-setup';
import { successfulCardActionsResponse } from './test-data';
import { validateSuccessResponseStructure, validateFailureResponseStructure } from './test-helpers';

/**
 * Comprehensive test scenarios for fetch_created_by function
 */

export const runComprehensiveErrorTestSuite = (
  run: (events: FunctionInput[]) => Promise<FetchCreatedByResponse>,
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
      mockTrelloClientInstance.getCardActions.mockRejectedValue(new Error('Network error'));

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

      expectFailureResponse(result, 500, 'Unknown error occurred during card creator fetching');
      expect(consoleSpy).toHaveBeenCalledWith('Fetch created by function error:', {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      });
    });
  });
};

export const runIntegrationTestSuite = (
  run: (events: FunctionInput[]) => Promise<FetchCreatedByResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('integration scenarios', () => {
    it('should process only the first event when multiple events are provided', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getCardActions.mockResolvedValue(successfulCardActionsResponse);

      const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'card-1');
      const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'card-2');

      const result = await run([mockEvent1, mockEvent2]);

      expect(mockFromConnectionData()).toHaveBeenCalledTimes(1);
      expect(mockFromConnectionData()).toHaveBeenCalledWith('key=api-key-1&token=token-1');
      expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledWith('card-1', 'createCard', 'idMemberCreator');
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

    it('should create TrelloClient with correct connection data and call API with correct parameters', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getCardActions.mockResolvedValue(successfulCardActionsResponse);

      const connectionKey = 'key=my-api-key&token=my-oauth-token';
      const cardId = 'my-card-id';
      const mockEvent = createMockEvent(connectionKey, cardId);
      
      await run([mockEvent]);

      expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
      expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledWith(cardId, 'createCard', 'idMemberCreator');
      expect(mockTrelloClientInstance.getCardActions).toHaveBeenCalledTimes(1);
    });
  });
};

export const runEdgeCaseTestSuite = (
  run: (events: FunctionInput[]) => Promise<FetchCreatedByResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('edge cases', () => {
    it('should handle actions with missing creator ID properties', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      const actionsWithMissingProps = [
        {
          id: 'action-1',
          type: 'createCard',
          // missing idMemberCreator
        },
        {
          id: 'action-2',
          type: 'createCard',
          idMemberCreator: undefined,
        },
      ];

      mockTrelloClientInstance.getCardActions.mockResolvedValue({
        data: actionsWithMissingProps,
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved card actions',
      });

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, 'No card creation action found or creator ID missing');
    });

    it('should handle empty actions array', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();

      mockTrelloClientInstance.getCardActions.mockResolvedValue({
        data: [],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved card actions',
      });

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, 'No card creation action found or creator ID missing');
    });
  });
};

/**
 * Additional test scenarios for comprehensive coverage
 */
export const createAdditionalTestScenarios = () => {
  return {
    multipleEventsScenario: {
      description: 'should process only the first event when multiple events are provided',
      createEvents: () => {
        const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'card-1');
        const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'card-2');
        return [mockEvent1, mockEvent2];
      },
      expectedConnectionData: 'key=api-key-1&token=token-1',
      expectedCardId: 'card-1',
    },
    errorLoggingScenario: {
      description: 'should log error details when errors occur',
      createEvents: () => [],
      expectedError: 'Invalid input: events array cannot be empty',
    },
    clientCreationScenario: {
      description: 'should create TrelloClient with correct connection data and call API with correct parameters',
      createEvent: (connectionKey: string, cardId: string) => createMockEvent(connectionKey, cardId),
      connectionKey: 'key=my-api-key&token=my-oauth-token',
      cardId: 'my-card-id',
    },
  };
};