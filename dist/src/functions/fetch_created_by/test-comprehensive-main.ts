import { TrelloClient } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';
import { FetchCreatedByResponse } from './index';
import {
  runComprehensiveErrorTestSuite,
  runIntegrationTestSuite,
  runEdgeCaseTestSuite,
} from './test-scenarios';

/**
 * Main comprehensive test runner for the fetch_created_by function
 */
export const runAllComprehensiveTests = (
  run: (events: FunctionInput[]) => Promise<FetchCreatedByResponse>,
  getMockTrelloClientInstance: () => jest.Mocked<TrelloClient>
) => {
  // Run all comprehensive test suites
  runComprehensiveErrorTestSuite(run, getMockTrelloClientInstance);
  runIntegrationTestSuite(run, getMockTrelloClientInstance);
  runEdgeCaseTestSuite(run, getMockTrelloClientInstance);
};