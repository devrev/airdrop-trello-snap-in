// Global setup for Jest tests
jest.setTimeout(120000); // 120 seconds timeout as per requirements

// Mock environment variables if not set
process.env.TRELLO_API_KEY = process.env.TRELLO_API_KEY || 'mock-api-key';
process.env.TRELLO_TOKEN = process.env.TRELLO_TOKEN || 'mock-token';
process.env.TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || 'mock-org-id';
process.env.TRELLO_TEST_BOARD_ID = process.env.TRELLO_TEST_BOARD_ID || 'mock-board-id';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Ensure tests exit cleanly by forcing process exit after all tests
afterAll(async (done) => {
  // Add a delay to ensure all network connections are closed
  await new Promise(resolve => setTimeout(resolve, 3000));
  process.exit(0);
});