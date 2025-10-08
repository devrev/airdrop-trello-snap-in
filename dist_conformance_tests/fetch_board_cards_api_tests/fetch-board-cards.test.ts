import axios from 'axios';
import { Server } from 'http';
import { getTestEnvironment, createCallbackServer, createBaseEvent, TestEnvironment } from './test-utils';
import { AxiosResponse } from 'axios';

describe('fetch_board_cards function', () => {
  let callbackServer: Server;
  let env: TestEnvironment;
  const snapInServerUrl = 'http://localhost:8000/handle/sync';

  beforeAll(async () => {
    env = getTestEnvironment();
    const { server } = await createCallbackServer();
    callbackServer = server;
  });

  afterAll(async () => {
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => {
          resolve();
        });
      });
    }
  });

  describe('Environment Setup', () => {
    test('should have required environment variables', () => {
      expect(env.trelloApiKey).toBeDefined();
      expect(env.trelloToken).toBeDefined();
      expect(env.trelloOrganizationId).toBeDefined();
      expect(env.trelloApiKey).not.toBe('');
      expect(env.trelloToken).not.toBe('');
      expect(env.trelloOrganizationId).not.toBe('');
    });
  });

  describe('Basic Functionality', () => {
    test('should fetch board cards with required limit parameter', async () => {
      const event = createBaseEvent(env, { limit: '10' });

      const response = await axios.post(snapInServerUrl, event);

      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status_code).toBeDefined();
      expect(response.data.function_result.api_delay).toBeDefined();
      expect(response.data.function_result.message).toBeDefined();

      if (response.data.function_result.status_code === 200) {
        expect(response.data.function_result.cards).toBeDefined();
        expect(Array.isArray(response.data.function_result.cards)).toBe(true);
      }
    });
  });

  describe('Pagination Support', () => {
    test('should support pagination with limit and before parameters', async () => {
      const event = createBaseEvent(env, { limit: '5', before: '688725db990240b77167efef' });

      const response = await axios.post(snapInServerUrl, event);

      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status_code).toBeDefined();
      expect(response.data.function_result.api_delay).toBeDefined();
      expect(response.data.function_result.message).toBeDefined();

      if (response.data.function_result.status_code === 200) {
        expect(response.data.function_result.cards).toBeDefined();
        expect(Array.isArray(response.data.function_result.cards)).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing limit parameter', async () => {
      const event = createBaseEvent(env);
      // Intentionally not setting limit parameter

      const response = await axios.post(snapInServerUrl, event);

      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status_code).toBe(0);
      expect(response.data.function_result.message).toContain('Missing required limit parameter');
    });

    test('should handle invalid limit parameter', async () => {
      const event = createBaseEvent(env, { limit: 'invalid' });

      const response = await axios.post(snapInServerUrl, event);

      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status_code).toBe(0);
      expect(response.data.function_result.message).toContain('Invalid limit parameter');
    });

    test('should handle missing board ID', async () => {
      const event = createBaseEvent(env, { limit: '10' });
      // Remove board ID by setting to undefined
      (event.payload.event_context as any).external_sync_unit_id = undefined;

      const response = await axios.post(snapInServerUrl, event);

      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.status_code).toBe(0);
      expect(response.data.function_result.message).toContain('Missing board ID');
    });

    test('should handle invalid board ID', async () => {
      const event = createBaseEvent(env, { limit: '10' });
      event.payload.event_context.external_sync_unit_id = 'invalid-board-id';

      const response = await axios.post(snapInServerUrl, event);

      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      
      if (response.data.function_result.status_code === 404) {
        expect(response.data.function_result.message).toContain('Board not found');
      }
    });
  });
});