import axios from 'axios';

const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

describe('fetch_labels conformance tests', () => {
  let trelloApiKey: string;
  let trelloToken: string;
  let trelloOrganizationId: string;

  beforeAll(() => {
    // Read credentials from environment
    trelloApiKey = process.env.TRELLO_API_KEY || '';
    trelloToken = process.env.TRELLO_TOKEN || '';
    trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID || '';

    if (!trelloApiKey || !trelloToken || !trelloOrganizationId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }
  });

  test('fetch_labels_successfully_fetches_and_validates_labels', async () => {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const boardId = '68e8befbf2f641caa9b1e275';

    // Construct connection data key
    const connectionDataKey = `key=${trelloApiKey}&token=${trelloToken}`;

    // Create the event payload
    const eventPayload = {
      execution_metadata: {
        request_id: testId,
        function_name: 'fetch_labels',
        event_type: 'test_event',
        devrev_endpoint: 'http://localhost:8003',
      },
      context: {
        dev_oid: 'test_dev_oid',
        source_id: 'test_source_id',
        snap_in_id: 'test_snap_in_id',
        snap_in_version_id: 'test_snap_in_version_id',
        service_account_id: 'test_service_account_id',
        secrets: {
          service_account_token: 'test_token',
        },
      },
      input_data: {
        global_values: {},
        event_sources: {},
      },
      payload: {
        connection_data: {
          key: connectionDataKey,
          org_id: trelloOrganizationId,
        },
        board_id: boardId,
      },
    };

    // Invoke fetch_labels function
    let response;
    try {
      response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error invoking fetch_labels:', error.response?.data || error.message);
      }
      throw error;
    }

    // Validate response structure
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();

    const functionResult = response.data.function_result;
    console.log('Function result:', JSON.stringify(functionResult, null, 2));

    // Verify successful response
    expect(functionResult.status_code).toBe(200);
    expect(functionResult.data).toBeDefined();
    expect(Array.isArray(functionResult.data)).toBe(true);

    // Verify exactly 6 labels are returned
    expect(functionResult.data.length).toBe(6);

    // Find the label with name "label-blue"
    const specificLabel = functionResult.data.find((label: any) => label.name === 'label-blue');
    expect(specificLabel).toBeDefined();

    if (!specificLabel) {
      console.error('Available labels:', functionResult.data.map((l: any) => l.name));
      throw new Error('Label with name "label-blue" not found in response');
    }

    // Validate specific label properties
    expect(specificLabel.name).toBe('label-blue');
    expect(specificLabel.style).toBe('#0000FF');
    expect(specificLabel.description).toBe('label-blue');
  });

  test('fetch_labels_handles_rate_limiting_correctly', async () => {
    const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const boardId = '68e8befbf2f641caa9b1e275';

    // Trigger rate limiting on mock server
    try {
      const MOCK_SERVER_URL = 'http://localhost:8004';
      await axios.post(`${MOCK_SERVER_URL}/start_rate_limiting`, {
        test_name: testId,
      });
    } catch (error) {
      console.error('Failed to trigger rate limiting on mock server:', error);
      throw error;
    }

    // Construct connection data key
    const connectionDataKey = `key=${trelloApiKey}&token=${trelloToken}`;

    // Create the event payload
    const eventPayload = {
      execution_metadata: {
        request_id: testId,
        function_name: 'fetch_labels',
        event_type: 'test_event',
        devrev_endpoint: 'http://localhost:8003',
      },
      context: {
        dev_oid: 'test_dev_oid',
        source_id: 'test_source_id',
        snap_in_id: 'test_snap_in_id',
        snap_in_version_id: 'test_snap_in_version_id',
        service_account_id: 'test_service_account_id',
        secrets: {
          service_account_token: 'test_token',
        },
      },
      input_data: {
        global_values: {},
        event_sources: {},
      },
      payload: {
        connection_data: {
          key: connectionDataKey,
          org_id: trelloOrganizationId,
        },
        board_id: boardId,
      },
    };

    // Invoke fetch_labels function
    let response;
    try {
      response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error invoking fetch_labels:', error.response?.data || error.message);
      }
      throw error;
    }

    // Validate response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();

    const functionResult = response.data.function_result;

    // Verify rate limiting was detected
    expect(functionResult.status_code).toBe(429);
    expect(functionResult.api_delay).toBeDefined();
    expect(typeof functionResult.api_delay).toBe('number');
    expect(functionResult.api_delay).toBeGreaterThan(0);
    expect(functionResult.api_delay).toBeLessThanOrEqual(3);
    expect(functionResult.message).toBeDefined();
    expect(typeof functionResult.message).toBe('string');
    expect(functionResult.message.toLowerCase()).toContain('rate limit');
  });
});