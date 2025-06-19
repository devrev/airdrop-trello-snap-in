import axios from 'axios';
import express, { Request, Response } from 'express';
import * as bodyParser from 'body-parser';
import { EventType } from '@devrev/ts-adaas';
import fs from 'fs';
import path from 'path';

// Test server endpoint
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_PATH = '/callback';
const CALLBACK_URL = `http://localhost:${CALLBACK_SERVER_PORT}${CALLBACK_PATH}`;

// Load the extraction health check JSON
const extractionHealthCheckPath = path.resolve(__dirname, './extraction_health_check.json');
const extractionHealthCheck = JSON.parse(fs.readFileSync(extractionHealthCheckPath, 'utf8'));

describe('Extraction Health Check Tests', () => {
  let server: any;
  let callbackReceived = false;
  let callbackData: any = null;

  // Set up the callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json());

    // Set up the callback endpoint
    app.post(CALLBACK_PATH, (req: Request, res: Response) => {
      console.log('Callback received:', JSON.stringify(req.body, null, 2));
      callbackReceived = true;
      callbackData = req.body;
      res.status(200).send({ status: 'ok' });
    });

    // Start the server
    server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      done();
    });
  });

  // Clean up the server after tests
  afterAll((done) => {
    if (server) {
      server.close(() => {
        console.log('Callback server closed');
        done();
      });
    } else {
      done();
    }
  });

  // Reset callback state before each test
  beforeEach(() => {
    callbackReceived = false;
    callbackData = null;
  });

  test('should successfully invoke extraction workflow with health check JSON', async () => {
    // Prepare the health check event
    const healthCheckEvent = { ...extractionHealthCheck };
    
    // Ensure the callback URL is set correctly
    if (healthCheckEvent.payload && healthCheckEvent.payload.event_context) {
      healthCheckEvent.payload.event_context.callback_url = CALLBACK_URL;
    }

    // Log the event being sent
    console.log('Sending health check event:', JSON.stringify(healthCheckEvent, null, 2));

    try {
      // Send the request to the test server
      const response = await axios.post(TEST_SERVER_URL, healthCheckEvent);
      
      // Log the response
      console.log('Response received:', JSON.stringify(response.data, null, 2));
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      
      // The can_extract function should return a successful result
      const result = response.data.function_result;
      expect(result).toHaveProperty('can_extract');
      expect(result).toHaveProperty('message');
      expect(result.can_extract).toBe(true);
      expect(result.message).toBe('Data extraction workflow can be invoked');
      
      // No errors should be present
      expect(response.data.error).toBeUndefined();
    } catch (error: any) {
      console.error('Test failed with error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error; // Re-throw to fail the test
    }
  });

  test('should handle extraction event with missing fields', async () => {
    // Create a copy of the health check event with missing fields
    const incompleteEvent = { ...extractionHealthCheck };
    
    // Remove the service_account_token
    if (incompleteEvent.context && incompleteEvent.context.secrets) {
      delete incompleteEvent.context.secrets.service_account_token;
    }
    
    try {
      // Send the request to the test server
      const response = await axios.post(TEST_SERVER_URL, incompleteEvent);
      
      // Log the response
      console.log('Response for incomplete event:', JSON.stringify(response.data, null, 2));
      
      // Verify the response indicates extraction cannot be invoked
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      
      const result = response.data.function_result;
      expect(result).toHaveProperty('can_extract');
      expect(result).toHaveProperty('message');
      expect(result.can_extract).toBe(false);
      expect(result.message).toContain('Missing service account token');
    } catch (error: any) {
      console.error('Test failed with error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  });
});