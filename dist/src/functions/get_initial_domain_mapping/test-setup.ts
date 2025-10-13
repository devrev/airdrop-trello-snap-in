import { FunctionInput, Context, ExecutionMetadata, InputData } from '../../core/types';

// Test data factories
export const createMockContext = (): Context => ({
  dev_oid: 'test-dev-oid',
  source_id: 'test-source-id',
  snap_in_id: 'test-snap-in-id',
  snap_in_version_id: 'test-snap-in-version-id',
  service_account_id: 'test-service-account-id',
  secrets: {
    service_account_token: 'test-token',
  },
});

export const createMockExecutionMetadata = (): ExecutionMetadata => ({
  request_id: 'test-request-id',
  function_name: 'get_initial_domain_mapping',
  event_type: 'test-event',
  devrev_endpoint: 'https://api.devrev.ai/',
});

export const createMockInputData = (): InputData => ({
  global_values: {},
  event_sources: {},
});

export const createMockEvent = (): FunctionInput => ({
  payload: { test: 'data' },
  context: createMockContext(),
  execution_metadata: createMockExecutionMetadata(),
  input_data: createMockInputData(),
});

// Test utilities
export const setupConsoleSpies = () => {
  return {
    errorSpy: jest.spyOn(console, 'error').mockImplementation(() => {}),
  };
};

export const clearAllMocks = () => {
  jest.clearAllMocks();
};

// Test case generators for common validation scenarios
export const createInvalidInputTestCases = () => [
  { input: null, expectedMessage: 'Invalid input: events must be an array' },
  { input: undefined, expectedMessage: 'Invalid input: events must be an array' },
  { input: 'not-array', expectedMessage: 'Invalid input: events must be an array' },
  { input: [], expectedMessage: 'Invalid input: events array cannot be empty' },
];

export const createInvalidEventTestCases = () => [
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
    name: 'missing context',
    eventModifier: (event: FunctionInput) => ({ ...event, context: undefined }),
    expectedMessage: 'Invalid event: missing context'
  },
  { 
    name: 'missing execution_metadata',
    eventModifier: (event: FunctionInput) => ({ ...event, execution_metadata: undefined }),
    expectedMessage: 'Invalid event: missing execution_metadata'
  },
  { 
    name: 'missing dev_oid in context',
    eventModifier: (event: FunctionInput) => {
      const { dev_oid, ...contextWithoutDevOid } = event.context;
      return { ...event, context: contextWithoutDevOid as any };
    },
    expectedMessage: 'Invalid event: missing dev_oid in context'
  },
  { 
    name: 'missing snap_in_id in context',
    eventModifier: (event: FunctionInput) => {
      const { snap_in_id, ...contextWithoutSnapInId } = event.context;
      return { ...event, context: contextWithoutSnapInId as any };
    },
    expectedMessage: 'Invalid event: missing snap_in_id in context'
  },
  { 
    name: 'missing request_id in execution_metadata',
    eventModifier: (event: FunctionInput) => {
      const { request_id, ...executionMetadataWithoutRequestId } = event.execution_metadata;
      return { ...event, execution_metadata: executionMetadataWithoutRequestId as any };
    },
    expectedMessage: 'Invalid event: missing request_id in execution_metadata'
  },
  { 
    name: 'missing function_name in execution_metadata',
    eventModifier: (event: FunctionInput) => {
      const { function_name, ...executionMetadataWithoutFunctionName } = event.execution_metadata;
      return { ...event, execution_metadata: executionMetadataWithoutFunctionName as any };
    },
    expectedMessage: 'Invalid event: missing function_name in execution_metadata'
  },
];