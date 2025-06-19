// This file contains setup code for the tests
import { CallbackServer } from './callback-server';

// Global callback server instance
let callbackServer: CallbackServer | null = null;

// Setup function to start the callback server if needed
export async function setupCallbackServer(): Promise<CallbackServer> {
  if (!callbackServer) {
    callbackServer = new CallbackServer();
    await callbackServer.start();
  }
  return callbackServer;
}

// Teardown function to stop the callback server
export async function teardownCallbackServer(): Promise<void> {
  if (callbackServer) {
    await callbackServer.stop();
    callbackServer = null;
  }
}

// Helper function to get the callback server instance
export function getCallbackServer(): CallbackServer | null {
  return callbackServer;
}