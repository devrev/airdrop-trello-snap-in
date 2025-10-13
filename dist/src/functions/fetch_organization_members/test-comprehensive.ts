import { TrelloClient } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';
import { FetchOrganizationMembersResponse } from './index';
import { 
  createMockEvent, 
  mockFromConnectionData, 
  expectSuccessResponse, 
  expectFailureResponse,
} from './test-setup';
import { successfulOrganizationMembersResponse } from './test-data';
import { validateSuccessResponseStructure, validateFailureResponseStructure } from './test-helpers';

/**
 * Comprehensive test scenarios for fetch_organization_members function
 */

export const runComprehensiveErrorTests = (
  run: (events: FunctionInput[]) => Promise<FetchOrganizationMembersResponse>,
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
      mockTrelloClientInstance.getOrganizationMembers.mockRejectedValue(new Error('Network error'));

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

      expectFailureResponse(result, 500, 'Unknown error occurred during organization members fetching');
      expect(consoleSpy).toHaveBeenCalledWith('Fetch organization members function error:', {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      });
    });
  });
};

export const runIntegrationTests = (
  run: (events: FunctionInput[]) => Promise<FetchOrganizationMembersResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('integration scenarios', () => {
    it('should process only the first event when multiple events are provided', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(successfulOrganizationMembersResponse);

      const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'org-1');
      const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'org-2');

      const result = await run([mockEvent1, mockEvent2]);

      expect(mockFromConnectionData()).toHaveBeenCalledTimes(1);
      expect(mockFromConnectionData()).toHaveBeenCalledWith('key=api-key-1&token=token-1');
      expect(mockTrelloClientInstance.getOrganizationMembers).toHaveBeenCalledWith('org-1');
      expectSuccessResponse(result);
    });

    it('should log error details when errors occur', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      const result = await run([]);

      expect(consoleSpy).toHaveBeenCalledWith('Fetch organization members function error:', {
        error_message: 'Invalid input: events array cannot be empty',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should create TrelloClient with correct connection data and call API with correct org ID', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(successfulOrganizationMembersResponse);

      const connectionKey = 'key=my-api-key&token=my-oauth-token';
      const orgId = 'my-organization-id';
      const mockEvent = createMockEvent(connectionKey, orgId);
      
      await run([mockEvent]);

      expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
      expect(mockTrelloClientInstance.getOrganizationMembers).toHaveBeenCalledWith(orgId);
      expect(mockTrelloClientInstance.getOrganizationMembers).toHaveBeenCalledTimes(1);
    });
  });
};

export const runEdgeCaseTests = (
  run: (events: FunctionInput[]) => Promise<FetchOrganizationMembersResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  describe('edge cases', () => {
    it('should handle members with missing optional properties', async () => {
      const mockTrelloClientInstance = getMockTrelloClientInstance();
      const membersWithMissingProps = [
        {
          id: 'member-1',
          username: 'user1',
          // missing fullName and lastActive
        },
        {
          id: 'member-2',
          fullName: 'User Two',
          // missing username and lastActive
        },
      ];

      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue({
        data: membersWithMissingProps,
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved organization members',
      });

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateSuccessResponseStructure(result);
      expect(result.members).toHaveLength(2);
      expect(result.members![0]).toEqual({
        id: 'member-1',
        username: 'user1',
        full_name: undefined,
        last_active: undefined,
      });
      expect(result.members![1]).toEqual({
        id: 'member-2',
        full_name: 'User Two',
        username: undefined,
        last_active: undefined,
      });
    });
  });
};