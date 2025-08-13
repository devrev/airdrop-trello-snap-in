import axios from 'axios';
import { TEST_SERVER_URL, checkEnvironmentVariables } from './utils';

describe('Basic Connectivity Tests', () => {
  beforeAll(() => {
    // Check if all required environment variables are set
    checkEnvironmentVariables();
  });

  test('Test server is accessible', async () => {
    // This is a simple connectivity test to ensure the test server is running
    try {
      // We expect this to fail with a 400 because we're not sending a valid request,
      // but it confirms the server is running and responding
      await axios.post(TEST_SERVER_URL, {});
      fail('Expected request to fail with 400');
    } catch (error: any) {
      // We expect a 400 Bad Request, not a connection error
      expect(error.response).toBeDefined();
      expect(error.response.status).toBe(400);
    }
  });
});