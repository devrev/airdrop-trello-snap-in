import {
  getTestEnvironment,
  createTestEvent,
  setupCallbackServer,
  sendEventToSnapIn,
  teardownCallbackServer,
  CallbackServerSetup,
  TestEnvironment,
} from './test-utils';

describe('fetch_boards function acceptance tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    await teardownCallbackServer(callbackServer);
  });

  describe('Acceptance: Board "SaaS connectors" exists', () => {
    it('should return a board with the name "SaaS connectors" in the results', async () => {
      const event = createTestEvent('fetch_boards', testEnv);
      
      const response = await sendEventToSnapIn(event);
      
      // Verify response structure
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      
      // Verify successful API call
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.message).toContain('Successfully fetched boards');
      
      // Verify boards array exists
      expect(Array.isArray(response.function_result.boards)).toBe(true);
      expect(response.function_result.boards.length).toBeGreaterThan(0);
      
      // Extract board names for debugging
      const boardNames = response.function_result.boards.map((board: any) => board.name);
      
      // Check for the specific board "SaaS connectors"
      const targetBoardName = 'SaaS connectors';
      const hasTargetBoard = response.function_result.boards.some((board: any) => 
        board.name === targetBoardName
      );
      
      // Provide detailed error message if board not found
      if (!hasTargetBoard) {
        const availableBoards = boardNames.join(', ');
        throw new Error(
          `Expected to find a board named "${targetBoardName}" but it was not found. ` +
          `Available boards: [${availableBoards}]. ` +
          `Total boards found: ${response.function_result.boards.length}. ` +
          `Please verify that the board "${targetBoardName}" exists in the Trello account ` +
          `associated with the provided credentials (API Key: ${testEnv.trelloApiKey.substring(0, 8)}..., ` +
          `Organization ID: ${testEnv.trelloOrgId}).`
        );
      }
      
      // Verify the found board has required properties
      const targetBoard = response.function_result.boards.find((board: any) => 
        board.name === targetBoardName
      );
      
      expect(targetBoard).toBeDefined();
      expect(typeof targetBoard.id).toBe('string');
      expect(targetBoard.id.length).toBeGreaterThan(0);
      expect(typeof targetBoard.name).toBe('string');
      expect(targetBoard.name).toBe(targetBoardName);
      
    }, 30000);
  });
});