import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';
import { createMockEvent } from './test-setup';

/**
 * Creates comprehensive test scenarios for various error conditions
 */
export const createComprehensiveErrorTestScenarios = () => {
  return {
    clientCreationError: {
      description: 'should handle TrelloClient creation errors',
      errorMessage: 'Invalid connection data format',
      setupMock: (TrelloClientMock: any) => {
        jest.spyOn(TrelloClientMock, 'fromConnectionData').mockImplementation(() => {
          throw new Error('Invalid connection data format');
        });
      },
      testCase: async (run: any, createMockEvent: any, expectFailureResponse: any) => {
        const mockEvent = createMockEvent();
        const result = await run([mockEvent]);
        expectFailureResponse(result, 500, 'Invalid connection data format');
      },
    },
    apiCallError: {
      description: 'should handle API call errors',
      errorMessage: 'Network error',
      setupMock: (mockInstance: any) => {
        mockInstance.getOrganizationMembers.mockRejectedValue(new Error('Network error'));
      },
      testCase: async (run: any, createMockEvent: any, expectFailureResponse: any) => {
        const mockEvent = createMockEvent();
        const result = await run([mockEvent]);
        expectFailureResponse(result, 500, 'Network error');
      },
    },
    unknownError: {
      description: 'should handle unknown errors gracefully',
      errorMessage: 'Unknown error occurred during organization members fetching',
      createEvent: () => {
        const mockEvent = createMockEvent();
        Object.defineProperty(mockEvent, 'payload', {
          get: () => {
            throw 'string error'; // Non-Error object
          }
        });
        return mockEvent;
      },
      expectedConsoleLog: {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      },
      testCase: async (run: any, expectFailureResponse: any) => {
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
      },
    },
  };
};

/**
 * Creates detailed validation test scenarios for input and event validation
 */
export const createDetailedValidationTestScenarios = () => {
  return {
    inputValidation: {
      testCases: [
        { 
          input: null, 
          expectedMessage: 'Invalid input: events must be an array',
          description: 'null input'
        },
        { 
          input: undefined, 
          expectedMessage: 'Invalid input: events must be an array',
          description: 'undefined input'
        },
        { 
          input: 'not-array', 
          expectedMessage: 'Invalid input: events must be an array',
          description: 'string input'
        },
        { 
          input: [], 
          expectedMessage: 'Invalid input: events array cannot be empty',
          description: 'empty array input'
        },
      ],
    },
    eventValidation: {
      testCases: [
        { 
          name: 'null event',
          eventModifier: () => null,
          expectedMessage: 'Invalid event: event cannot be null or undefined'
        },
        { 
          name: 'undefined event',
          eventModifier: () => undefined,
          expectedMessage: 'Invalid event: event cannot be null or undefined'
        },
        { 
          name: 'missing payload',
          eventModifier: (event: FunctionInput) => ({ ...event, payload: undefined }),
          expectedMessage: 'Invalid event: missing payload'
        },
        { 
          name: 'missing connection_data',
          eventModifier: (event: FunctionInput) => ({ 
            ...event, 
            payload: { ...event.payload, connection_data: undefined } 
          }),
          expectedMessage: 'Invalid event: missing connection_data in payload'
        },
        { 
          name: 'missing key in connection_data',
          eventModifier: (event: FunctionInput) => ({ 
            ...event, 
            payload: { ...event.payload, connection_data: { org_id: 'test-org' } } 
          }),
          expectedMessage: 'Invalid event: missing key in connection_data'
        },
        { 
          name: 'missing org_id in connection_data',
          eventModifier: (event: FunctionInput) => ({ 
            ...event, 
            payload: { ...event.payload, connection_data: { key: 'test-key' } } 
          }),
          expectedMessage: 'Invalid event: missing org_id in connection_data'
        },
      ],
    },
  };
};

/**
 * Creates comprehensive integration test scenarios
 */
export const createIntegrationTestScenarios = () => {
  return {
    multipleEvents: {
      description: 'should process only the first event when multiple events are provided',
      createTestCase: () => {
        const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'org-1');
        const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'org-2');
        
        return {
          events: [mockEvent1, mockEvent2],
          expectedConnectionData: 'key=api-key-1&token=token-1',
          expectedOrgId: 'org-1',
        };
      },
    },
    errorLogging: {
      description: 'should log error details when errors occur',
      testCase: async (run: any) => {
        const consoleSpy = jest.spyOn(console, 'error');
        const result = await run([]);
        expect(consoleSpy).toHaveBeenCalledWith('Fetch organization members function error:', {
          error_message: 'Invalid input: events array cannot be empty',
          error_stack: expect.any(String),
          timestamp: expect.any(String),
        });
        return result;
      },
    },
    clientCreation: {
      description: 'should create TrelloClient with correct connection data and call API with correct org ID',
      testCase: async (run: any, mockTrelloClientInstance: any, mockFromConnectionData: any) => {
        const connectionKey = 'key=my-api-key&token=my-oauth-token';
        const orgId = 'my-organization-id';
        const mockEvent = createMockEvent(connectionKey, orgId);
        
        await run([mockEvent]);

        expect(mockFromConnectionData()).toHaveBeenCalledWith(connectionKey);
        expect(mockTrelloClientInstance.getOrganizationMembers).toHaveBeenCalledWith(orgId);
        expect(mockTrelloClientInstance.getOrganizationMembers).toHaveBeenCalledTimes(1);
      },
    },
    missingProperties: {
      description: 'should handle members with missing optional properties',
      createMembersData: () => [
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
      ],
      expectedMembers: [
        {
          id: 'member-1',
          username: 'user1',
          full_name: undefined,
          last_active: undefined,
        },
        {
          id: 'member-2',
          full_name: 'User Two',
          username: undefined,
          last_active: undefined,
        },
      ],
    },
  };
};