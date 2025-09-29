import * as http from 'http';
import axios from 'axios';
import { getTestEnvironment, createCallbackServer, createBaseTestEvent, callSnapInFunction } from './test-utils';

describe('download_attachment function', () => {
  let callbackServer: http.Server;
  let env: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await createCallbackServer();
  });

  afterAll((done) => {
    if (callbackServer) {
      callbackServer.close(done);
    } else {
      done();
    }
  });

  describe('Parameter validation (trivial)', () => {
    test('should fail when idCard parameter is missing', async () => {
      const event = createBaseTestEvent(env, {
        idAttachment: 'test-attachment-id',
        fileName: 'test-file.pdf'
      });

      const result = await callSnapInFunction(event);

      expect(result.function_result).toBeDefined();
      expect(result.function_result.status_code).toBe(0);
      expect(result.function_result.api_delay).toBe(0);
      expect(result.function_result.message).toContain('Missing required idCard parameter');
      expect(result.function_result.attachment_data).toBeUndefined();
    });

    test('should fail when idAttachment parameter is missing', async () => {
      const event = createBaseTestEvent(env, {
        idCard: '688725db990240b77167efef',
        fileName: 'test-file.pdf'
      });

      const result = await callSnapInFunction(event);

      expect(result.function_result).toBeDefined();
      expect(result.function_result.status_code).toBe(0);
      expect(result.function_result.api_delay).toBe(0);
      expect(result.function_result.message).toContain('Missing required idAttachment parameter');
      expect(result.function_result.attachment_data).toBeUndefined();
    });

    test('should fail when fileName parameter is missing', async () => {
      const event = createBaseTestEvent(env, {
        idCard: '688725db990240b77167efef',
        idAttachment: 'test-attachment-id'
      });

      const result = await callSnapInFunction(event);

      expect(result.function_result).toBeDefined();
      expect(result.function_result.status_code).toBe(0);
      expect(result.function_result.api_delay).toBe(0);
      expect(result.function_result.message).toContain('Missing required fileName parameter');
      expect(result.function_result.attachment_data).toBeUndefined();
    });
  });

  describe('Authentication handling (simple)', () => {
    test('should handle invalid connection data gracefully', async () => {
      const event = createBaseTestEvent(env, {
        idCard: '688725db990240b77167efef',
        idAttachment: 'test-attachment-id',
        fileName: 'test-file.pdf'
      });

      // Corrupt the connection data
      event.payload.connection_data.key = 'invalid-key-format';

      const result = await callSnapInFunction(event);

      expect(result.function_result).toBeDefined();
      expect(result.function_result.status_code).toBe(0);
      expect(result.function_result.api_delay).toBe(0);
      expect(result.function_result.message).toContain('Invalid connection data');
      expect(result.function_result.attachment_data).toBeUndefined();
    });
  });

  describe('OAuth 1.0a download functionality (complex)', () => {
    test('should attempt to download attachment with OAuth 1.0a authorization', async () => {
      const event = createBaseTestEvent(env, {
        idCard: '688725db990240b77167efef',
        idAttachment: 'test-attachment-id',
        fileName: 'test-file.pdf'
      });

      const result = await callSnapInFunction(event);

      expect(result.function_result).toBeDefined();
      expect(result.function_result.status_code).toBeDefined();
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();

      // The function should make an API call with OAuth 1.0a authorization
      // Even if the attachment doesn't exist, we should get a proper HTTP response
      expect(typeof result.function_result.status_code).toBe('number');
      expect(typeof result.function_result.api_delay).toBe('number');
      expect(typeof result.function_result.message).toBe('string');

      // If successful (status 200), attachment_data should be present
      if (result.function_result.status_code === 200) {
        expect(result.function_result.attachment_data).toBeDefined();
      }

      // If rate limited (status 429), api_delay should be > 0
      if (result.function_result.status_code === 429) {
        expect(result.function_result.api_delay).toBeGreaterThan(0);
        expect(result.function_result.message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Rate limiting handling', () => {
    test('should handle rate limiting correctly with proper api_delay calculation', async () => {
      const testIdentifier = `download_attachment_rate_limit_test_${Date.now()}`;
      
      try {
        // Step 1: Start rate limiting on the mock API server
        let startRateLimitResponse;
        try {
          startRateLimitResponse = await axios.post('http://localhost:8004/start_rate_limiting', {
            test_name: testIdentifier
          }, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } catch (error: any) {
          throw new Error(`Failed to start rate limiting on mock API server at http://localhost:8004/start_rate_limiting. Error: ${error.message}. Please ensure the API server is running and accessible.`);
        }

        if (startRateLimitResponse.status !== 200) {
          throw new Error(`Failed to start rate limiting. Expected status 200 but got ${startRateLimitResponse.status}. Response: ${JSON.stringify(startRateLimitResponse.data)}`);
        }

        // Step 2: Invoke the download_attachment function with valid parameters
        const event = createBaseTestEvent(env, {
          idCard: '688725db990240b77167efef',
          idAttachment: 'test-attachment-id',
          fileName: 'test-file.pdf'
        });

        let functionResult;
        try {
          functionResult = await callSnapInFunction(event);
        } catch (error: any) {
          throw new Error(`Failed to invoke download_attachment function through snap-in server. Error: ${error.message}. Please ensure the snap-in server is running at http://localhost:8000/handle/sync`);
        }

        // Step 3: Verify the function returned a result
        if (!functionResult || !functionResult.function_result) {
          throw new Error(`Function did not return expected result structure. Got: ${JSON.stringify(functionResult)}`);
        }

        const result = functionResult.function_result;

        // Step 4: Verify required response fields are present
        if (typeof result.status_code !== 'number') {
          throw new Error(`Expected status_code to be a number, but got ${typeof result.status_code}: ${result.status_code}`);
        }

        if (typeof result.api_delay !== 'number') {
          throw new Error(`Expected api_delay to be a number, but got ${typeof result.api_delay}: ${result.api_delay}`);
        }

        if (typeof result.message !== 'string') {
          throw new Error(`Expected message to be a string, but got ${typeof result.message}: ${result.message}`);
        }

        // Step 5: Verify rate limiting response (status_code = 429)
        if (result.status_code !== 429) {
          throw new Error(`Expected rate limited response (status_code 429) due to active rate limiting, but got status_code ${result.status_code} with message: "${result.message}". API delay: ${result.api_delay} seconds. This suggests the rate limiting was not properly applied or the function did not handle it correctly.`);
        }

        // Step 6: Verify api_delay is within expected range (> 0 and <= 3)
        if (result.api_delay <= 0) {
          throw new Error(`Expected api_delay to be greater than 0 for rate limited response, but got ${result.api_delay}. This indicates the function did not properly calculate the retry delay from the Retry-After header.`);
        }

        if (result.api_delay > 3) {
          throw new Error(`Expected api_delay to be <= 3 seconds, but got ${result.api_delay}. This suggests there may be an issue with api_delay calculation in the implementation code. The delay should be calculated from the Retry-After header or default to 5 seconds if header is missing.`);
        }

        // Step 7: Verify the message indicates rate limiting
        if (!result.message.toLowerCase().includes('rate limit')) {
          throw new Error(`Expected message to indicate rate limiting, but got: "${result.message}". The message should contain information about rate limiting when status_code is 429.`);
        }

        // Step 8: Verify attachment_data is not present for rate limited responses
        if (result.attachment_data !== undefined) {
          throw new Error(`Expected attachment_data to be undefined for rate limited response, but got: ${JSON.stringify(result.attachment_data)}`);
        }

      } finally {
        // Step 9: Always end rate limiting, even if test fails
        try {
          const endRateLimitResponse = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (endRateLimitResponse.status !== 200) {
            console.warn(`Warning: Failed to properly end rate limiting. Status: ${endRateLimitResponse.status}, Response: ${JSON.stringify(endRateLimitResponse.data)}`);
          }
        } catch (error: any) {
          console.warn(`Warning: Failed to end rate limiting on mock API server. Error: ${error.message}. This may affect subsequent tests.`);
        }
      }
    }, 30000); // 30 second timeout due to network operations and rate limiting setup
  });

  describe('Acceptance Test', () => {
    test('should successfully download specific attachment with real data', async () => {
      const event = createBaseTestEvent(env, {
        idCard: '688725db990240b77167efef',
        idAttachment: '68c2be83c413a1889bde83df',
        fileName: 'temporary-file-name.png'
      });

      const result = await callSnapInFunction(event);

      // Verify the function returned a result
      expect(result.function_result).toBeDefined();
      if (!result.function_result) {
        throw new Error('Function result is undefined - the download_attachment function did not return any response');
      }

      // Verify required response fields are present
      expect(result.function_result.status_code).toBeDefined();
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();

      if (typeof result.function_result.status_code !== 'number') {
        throw new Error(`Expected status_code to be a number, but got ${typeof result.function_result.status_code}: ${result.function_result.status_code}`);
      }

      if (typeof result.function_result.api_delay !== 'number') {
        throw new Error(`Expected api_delay to be a number, but got ${typeof result.function_result.api_delay}: ${result.function_result.api_delay}`);
      }

      if (typeof result.function_result.message !== 'string') {
        throw new Error(`Expected message to be a string, but got ${typeof result.function_result.message}: ${result.function_result.message}`);
      }

      // The call should succeed (status_code 200)
      if (result.function_result.status_code !== 200) {
        throw new Error(`Expected successful download (status_code 200), but got status_code ${result.function_result.status_code} with message: "${result.function_result.message}". API delay: ${result.function_result.api_delay} seconds.`);
      }

      // For successful downloads, api_delay should be 0
      expect(result.function_result.api_delay).toBe(0);
      if (result.function_result.api_delay !== 0) {
        throw new Error(`Expected api_delay to be 0 for successful download, but got ${result.function_result.api_delay}`);
      }

      // Message should indicate success
      expect(result.function_result.message).toContain('Successfully downloaded attachment');
      if (!result.function_result.message.includes('Successfully downloaded attachment')) {
        throw new Error(`Expected success message to contain "Successfully downloaded attachment", but got: "${result.function_result.message}"`);
      }

      // Attachment data should be present for successful downloads
      expect(result.function_result.attachment_data).toBeDefined();
      if (!result.function_result.attachment_data) {
        throw new Error('Expected attachment_data to be present for successful download, but it was undefined');
      }

      // Attachment data should be binary data (Buffer object after JSON serialization)
      // When a Buffer is JSON serialized and deserialized, it becomes an object with type: 'Buffer' and data: number[]
      if (typeof result.function_result.attachment_data !== 'object' || 
          result.function_result.attachment_data === null ||
          result.function_result.attachment_data.type !== 'Buffer' ||
          !Array.isArray(result.function_result.attachment_data.data)) {
        throw new Error(`Expected attachment_data to be a serialized Buffer object with type: 'Buffer' and data array, but got: ${JSON.stringify(result.function_result.attachment_data)}`);
      }

      // Attachment data should not be empty
      if (result.function_result.attachment_data.data.length === 0) {
        throw new Error('Expected attachment_data to contain data, but got empty Buffer');
      }

      // Validate that the data array contains valid byte values (0-255)
      if (!result.function_result.attachment_data.data.every((byte: any) => typeof byte === 'number' && byte >= 0 && byte <= 255)) {
        throw new Error('Expected attachment_data.data to contain valid byte values (0-255)');
      }
    }, 30000); // 30 second timeout for this test due to potential network delays
  });
});