import axios from 'axios';

/**
 * Client for interacting with the Test Snap-In Server
 */
export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Sends a request to the auth_check function
   * 
   * @param apiKey - Trello API key
   * @param token - Trello token
   * @returns The response from the auth_check function
   */
  async callAuthCheck(apiKey: string, token: string): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}/handle/sync`, {
        context: {
          dev_oid: 'test-dev-oid',
          source_id: 'test-source-id',
          snap_in_id: 'test-snap-in-id',
          snap_in_version_id: 'test-snap-in-version-id',
          service_account_id: 'test-service-account-id',
          secrets: {
            service_account_token: 'test-token'
          }
        },
        payload: {
          connection_data: {
            key: `key=${apiKey}&token=${token}`,
            key_type: 'api_key'
          }
        },
        execution_metadata: {
          request_id: 'test-request-id',
          function_name: 'auth_check',
          event_type: 'test',
          devrev_endpoint: 'http://localhost:8003'
        },
        input_data: {
          global_values: {},
          event_sources: {}
        }
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`API request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}