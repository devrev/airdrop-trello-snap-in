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
  successfulOrganizationMembersResponse,
  authFailureResponse,
  rateLimitResponse,
  notFoundResponse,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
  mockOrganizationMembersData,
  transformMembersForExpectation,
} from './test-data';
import {
  createOrganizationMembersTestScenarios,
  validateSuccessResponseStructure,
  validateFailureResponseStructure,
} from './test-helpers';
import {
  runComprehensiveErrorTests,
  runIntegrationTests,
  runEdgeCaseTests,
} from './test-comprehensive';

describe('fetch_organization_members function', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
    mockTrelloClientInstance = setupMockTrelloClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with organization members data', async () => {
    mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(successfulOrganizationMembersResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    const expectedMembers = transformMembersForExpectation(mockOrganizationMembersData);
    expectSuccessResponse(result, expectedMembers);
  });

  it('should return failure response for invalid authentication', async () => {
    mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(authFailureResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 401, 'Authentication failed - invalid API key or token');
  });

  it('should handle rate limiting correctly', async () => {
    mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(rateLimitResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 429, 'Rate limit exceeded - retry after 60 seconds', 60);
  });

  it('should handle organization not found error', async () => {
    mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(notFoundResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 404, 'Organization not found');
  });

  describe('organization members response scenarios', () => {
    const scenarios = createOrganizationMembersTestScenarios();

    it(scenarios.emptyMembers.description, async () => {
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(scenarios.emptyMembers.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expectSuccessResponse(result, scenarios.emptyMembers.expectedMembers);
    });

    it(scenarios.customMember.description, async () => {
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(scenarios.customMember.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateSuccessResponseStructure(result);
      expect(result.members).toHaveLength(1);
      expect(result.members![0]).toEqual(scenarios.customMember.expectedMember);
    });

    it(scenarios.serverError.description, async () => {
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(scenarios.serverError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 500, 'Trello API server error');
    });

    it(scenarios.notFoundError.description, async () => {
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(scenarios.notFoundError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 404, 'Organization not found');
    });

    it(scenarios.successWithoutData.description, async () => {
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(scenarios.successWithoutData.mockResponse);

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

  // Run comprehensive test suites
  runComprehensiveErrorTests(run, () => mockTrelloClientInstance);
  runIntegrationTests(run, () => mockTrelloClientInstance);
  runEdgeCaseTests(run, () => mockTrelloClientInstance);
});