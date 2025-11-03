import { processTask } from '@devrev/ts-adaas';
import { runDataExtractionTests } from './data-extraction-test-orchestrator';

// Mock processTask to capture the task and onTimeout functions
let mockTask: any;
let mockOnTimeout: any;

// Mock the TrelloClient module before importing
jest.mock('../../../core/trello-client');

jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  processTask: jest.fn(({ task, onTimeout }) => {
    mockTask = task;
    mockOnTimeout = onTimeout;
  }),
  ExtractorEventType: {
    ExtractionDataDone: 'EXTRACTION_DATA_DONE',
    ExtractionDataError: 'EXTRACTION_DATA_ERROR',
    ExtractionDataDelay: 'EXTRACTION_DATA_DELAY',
    ExtractionDataProgress: 'EXTRACTION_DATA_PROGRESS',
  },
}));

// Import the worker file to trigger processTask and capture task/onTimeout
// This must happen after the mocks are set up but before the tests run
require('./data-extraction');

describe('data-extraction worker', () => {
  runDataExtractionTests(mockTask, mockOnTimeout);
});