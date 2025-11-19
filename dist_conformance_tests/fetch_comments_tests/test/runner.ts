/**
 * Test utilities for conformance tests
 */

export interface TestCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

/**
 * Setup test environment by reading credentials from environment variables
 */
export function setupTestEnvironment(): TestCredentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey) {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }

  if (!token) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }

  if (!organizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }

  return {
    apiKey,
    token,
    organizationId,
  };
}

export interface CreateEventPayloadOptions {
  functionName: string;
  connectionDataKey: string;
  connectionDataOrgId: string;
  inputData?: {
    global_values?: Record<string, string>;
    event_sources?: Record<string, string>;
  };
}

/**
 * Create a properly structured event payload for snap-in invocation
 */
export function createEventPayload(options: CreateEventPayloadOptions): any {
  return {
    payload: {
      connection_data: {
        key: options.connectionDataKey,
        org_id: options.connectionDataOrgId,
      },
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: options.functionName,
      event_type: 'test-event',
      devrev_endpoint: 'https://api.devrev.ai/',
    },
    input_data: options.inputData || {
      global_values: {},
      event_sources: {},
    },
  };
}