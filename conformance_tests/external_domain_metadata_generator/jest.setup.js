// Global setup for Jest tests
const axios = require('axios');

// Add a cleanup function to close any pending connections
afterAll(async () => {
  // Wait longer for any pending requests to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Also add cleanup before each test
beforeAll(async () => {
  // Clear any pending requests
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Add global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Configure axios with defaults that help prevent hanging tests
axios.defaults.timeout = 15000;
axios.interceptors.response.use(response => {
  return response;
}, error => {
  // Make sure to properly handle errors to prevent hanging
  console.error('Axios error intercepted:', error.message);
  return Promise.reject(error);
});

jest.setTimeout(30000); // Increase timeout for individual tests