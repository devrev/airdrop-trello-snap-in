import { getCredentialsFromEnv, createFetchBoardsEvent, sendEventToSnapIn } from './test-helpers';

describe('fetch_boards acceptance tests', () => {
  let credentials: ReturnType<typeof getCredentialsFromEnv>;

  beforeAll(() => {
    credentials = getCredentialsFromEnv();
  });

  describe('Acceptance Test: fetch_boards_specific_requirements', () => {
    it('should return exactly 4 boards with specific board "2025-10-10 - Board with 12 cards" having correct properties', async () => {
      // Create event payload with valid credentials
      const event = createFetchBoardsEvent(credentials);

      // Send request to snap-in server
      const response = await sendEventToSnapIn(event);

      // Verify successful response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.error).toBeUndefined();
      expect(response.data.function_result).toBeDefined();

      const functionResult = response.data.function_result;

      // Verify successful status code
      if (functionResult.status_code !== 200) {
        console.error(`Expected status_code to be 200, but got ${functionResult.status_code}. Message: ${functionResult.message}`);
      }
      expect(functionResult.status_code).toBe(200);

      // Verify data field exists and is an array
      expect(functionResult.data).toBeDefined();
      if (!Array.isArray(functionResult.data)) {
        console.error(`Expected data to be an array, but got ${typeof functionResult.data}`);
      }
      expect(Array.isArray(functionResult.data)).toBe(true);

      const boards = functionResult.data;

      // Requirement 1: Expect exactly 4 boards
      if (boards.length !== 4) {
        console.error(`Expected exactly 4 boards, but got ${boards.length}. Board names: ${boards.map((b: any) => b.name).join(', ')}`);
      }
      expect(boards.length).toBe(4);

      // Requirement 2: Find board with name "2025-10-10 - Board with 12 cards"
      const specificBoard = boards.find(
        (board: any) => board.name === '2025-10-10 - Board with 12 cards'
      );

      // Verify specific board exists
      expect(specificBoard).toBeDefined();
      if (!specificBoard) {
        const boardNames = boards.map((b: any) => b.name).join('\n  - ');
        throw new Error(
          `Expected to find board with name "2025-10-10 - Board with 12 cards", but it was not found.\n` +
          `Available boards:\n  - ${boardNames}`
        );
      }

      // Requirement 3: Verify specific board properties
      
      // Verify id
      if (specificBoard.id !== '68e8befbf2f641caa9b1e275') {
        console.error(`Expected specific board id to be "68e8befbf2f641caa9b1e275", but got "${specificBoard.id}"`);
      }
      expect(specificBoard.id).toBe('68e8befbf2f641caa9b1e275');

      // Verify description (desc field should be empty string)
      if (specificBoard.description !== '') {
        console.error(`Expected specific board description to be empty string, but got "${specificBoard.description}"`);
      }
      expect(specificBoard.description).toBe('');

      // Verify item_type
      if (specificBoard.item_type !== 'cards') {
        console.error(`Expected specific board item_type to be "cards", but got "${specificBoard.item_type}"`);
      }
      expect(specificBoard.item_type).toBe('cards');

      // Log success with board details for verification
      console.log('✓ Acceptance test passed successfully');
      console.log(`  - Total boards: ${boards.length}`);
      console.log(`  - Specific board found: "${specificBoard.name}"`);
      console.log(`  - Board ID: ${specificBoard.id}`);
      console.log(`  - Board description: "${specificBoard.description}"`);
      console.log(`  - Board item_type: ${specificBoard.item_type}`);
    }, 30000);
  });
});