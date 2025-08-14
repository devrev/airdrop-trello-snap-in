import { server } from './callback-server';

// Start the callback server before tests
beforeAll(async () => {
  console.log('Starting callback server on port 8002');
});

// Close the server after tests
afterAll(async () => {
  console.log('Shutting down callback server');
  await new Promise<void>((resolve) => {
    server.close(() => {
      console.log('Callback server shut down');
      resolve();
    });
  });
});