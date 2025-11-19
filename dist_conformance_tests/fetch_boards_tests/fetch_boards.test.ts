import { getCredentialsFromEnv, createFetchBoardsEvent, sendEventToSnapIn } from './test-helpers';

describe('fetch_boards function tests', () => {
  let credentials: ReturnType<typeof getCredentialsFromEnv>;

  beforeAll(() => {
    credentials = getCredentialsFromEnv();
  });

  describe('Test 1: fetch_boards_function_invocation_success', () => {
    it('should successfully invoke fetch_boards function with valid credentials', async () => {
      // Create event payload with valid credentials
      const event = createFetchBoardsEvent(credentials);

      // Send synchronous request to snap-in server
      const response = await sendEventToSnapIn(event);

      // Assert successful invocation
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.error).toBeUndefined();
    }, 30000);
  });

  describe('Test 2: fetch_boards_response_structure', () => {
    it('should return response with correct structure', async () => {
      // Create event payload with valid credentials
      const event = createFetchBoardsEvent(credentials);

      // Send request to snap-in server
      const response = await sendEventToSnapIn(event);

      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();

      const functionResult = response.data.function_result;

      // Verify function_result contains required fields
      expect(functionResult.status_code).toBe(200);
      expect(functionResult.api_delay).toBe(0);
      expect(functionResult.message).toBeDefined();
      expect(typeof functionResult.message).toBe('string');
      expect(functionResult.message.length).toBeGreaterThan(0);
      expect(functionResult.data).toBeDefined();
    }, 30000);
  });

  describe('Test 3: fetch_boards_returns_array_of_boards', () => {
    it('should return an array of boards with correct format', async () => {
      // Create event payload with valid credentials
      const event = createFetchBoardsEvent(credentials);

      // Send request to snap-in server
      const response = await sendEventToSnapIn(event);

      // Verify response status
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();

      const functionResult = response.data.function_result;

      // Verify data field exists and is an array
      expect(functionResult.data).toBeDefined();
      expect(Array.isArray(functionResult.data)).toBe(true);

      // Verify array is not empty
      expect(functionResult.data.length).toBeGreaterThan(0);

      // Verify each board has the expected structure according to ObjectPRD
      const firstBoard = functionResult.data[0];
      expect(firstBoard).toBeDefined();
      expect(firstBoard.id).toBeDefined();
      expect(typeof firstBoard.id).toBe('string');
      expect(firstBoard.name).toBeDefined();
      expect(typeof firstBoard.name).toBe('string');
      expect(firstBoard.description).toBeDefined();
      expect(typeof firstBoard.description).toBe('string');
      expect(firstBoard.item_type).toBe('cards');
    }, 30000);
  });
});