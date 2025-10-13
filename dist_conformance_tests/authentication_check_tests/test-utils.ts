import axios from 'axios';

export interface TestCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

export interface TestEventPayload {
  payload: {
    connection_data: {
      org_id: string;
      org_name: string;
      key: string;
      key_type: string;
    };
    event_context: {
      callback_url: string;
      dev_org: string;
      dev_org_id: string;
      dev_user: string;
      dev_user_id: string;
      external_sync_unit: string;
      external_sync_unit_id: string;
      external_sync_unit_name: string;
      external_system: string;
      external_system_type: string;
      import_slug: string;
      mode: string;
      request_id: string;
      snap_in_slug: string;
      snap_in_version_id: string;
      sync_run: string;
      sync_run_id: string;
      sync_tier: string;
      sync_unit: string;
      sync_unit_id: string;
      uuid: string;
      worker_data_url: string;
    };
    event_type: string;
    event_data: {};
  };
  context: {
    dev_oid: string;
    source_id: string;
    snap_in_id: string;
    snap_in_version_id: string;
    service_account_id: string;
    secrets: {
      service_account_token: string;
    };
  };
  execution_metadata: {
    request_id: string;
    function_name: string;
    event_type: string;
    devrev_endpoint: string;
  };
  input_data: {
    global_values: {};
    event_sources: {};
  };
}

/**
 * Reads test credentials from environment variables
 */
export function getTestCredentials(): TestCredentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!token) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!organizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return { apiKey, token, organizationId };
}

/**
 * Creates a test event payload for authentication check
 */
export function createAuthCheckEventPayload(connectionData: string): TestEventPayload {
  return {
    payload: {
      connection_data: {
        org_id: "test-org-id",
        org_name: "Test Organization",
        key: connectionData,
        key_type: "oauth"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "test-dev-org",
        dev_org_id: "test-dev-org-id",
        dev_user: "test-user",
        dev_user_id: "test-user-id",
        external_sync_unit: "68e8befbf2f641caa9b1e275",
        external_sync_unit_id: "68e8befbf2f641caa9b1e275",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "project_management",
        import_slug: "test-import",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "test-version-id",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "standard",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "authentication_check",
      event_data: {}
    },
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-snap-in-version-id",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-service-account-token"
      }
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "check_authentication",
      event_type: "authentication_check",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

/**
 * Sends a request to the snap-in server
 */
export async function callSnapInFunction(eventPayload: TestEventPayload): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', eventPayload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Snap-in server request failed: ${error.message}. Status: ${error.response?.status}. Data: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

/**
 * Starts rate limiting on the test API server
 */
export async function startRateLimiting(testName: string): Promise<void> {
  try {
    await axios.post('http://localhost:8004/start_rate_limiting', {
      test_name: testName
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to start rate limiting: ${error.message}. Status: ${error.response?.status}. Data: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

/**
 * Ends rate limiting on the test API server
 */
export async function endRateLimiting(): Promise<void> {
  try {
    await axios.post('http://localhost:8004/end_rate_limiting', {}, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to end rate limiting: ${error.message}. Status: ${error.response?.status}. Data: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}