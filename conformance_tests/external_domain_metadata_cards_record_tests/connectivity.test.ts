import axios from 'axios';
import { TEST_SERVER_URL, callTestServer } from './utils';

// Helper function to retry tests that might be flaky due to network issues
const retryTest = async (testFn: () => Promise<void>, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await testFn();
      return; // Test passed, exit
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError; // All attempts failed
};

describe('Basic Connectivity Tests', () => {
  test('Test server is accessible', async () => {
    await retryTest(async () => {
      const response = await callTestServer('health_check');
      expect(response).toBeTruthy();
      expect(response.status).toBe('success');
      expect(response.message).toContain('Function is operational');
    });
  }, 10000); // 10 second timeout
});