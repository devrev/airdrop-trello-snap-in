import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Credentials for Trello API
 */
export interface TrelloCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

/**
 * Read Trello credentials from environment variables
 */
export function readCredentialsFromEnv(): TrelloCredentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey) {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!token) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!organizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }

  return { apiKey, token, organizationId };
}

/**
 * Construct connection data key from API key and token
 */
export function constructConnectionDataKey(apiKey: string, token: string): string {
  return `key=${apiKey}&token=${token}`;
}

/**
 * Load event payload from JSON file and replace credential placeholders
 */
export function loadEventPayload(
  filename: string,
  credentials: TrelloCredentials,
  additionalReplacements?: Record<string, any>
): any {
  const filePath = path.join(__dirname, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  let event = JSON.parse(fileContent);

  // Replace connection data
  const connectionDataKey = constructConnectionDataKey(credentials.apiKey, credentials.token);
  event.payload.connection_data.key = connectionDataKey;
  event.payload.connection_data.org_id = credentials.organizationId;

  // Apply additional replacements if provided
  if (additionalReplacements) {
    event = deepReplace(event, additionalReplacements);
  }

  return event;
}

/**
 * Deep replace values in an object
 */
function deepReplace(obj: any, replacements: Record<string, any>): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepReplace(item, replacements));
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (replacements.hasOwnProperty(key)) {
        result[key] = replacements[key];
      } else {
        result[key] = deepReplace(obj[key], replacements);
      }
    }
  }
  return result;
}

/**
 * Send event to test snap-in server
 */
export async function sendEventToSnapIn(event: any): Promise<AxiosResponse> {
  const snapInUrl = 'http://localhost:8000/handle/sync';
  return axios.post(snapInUrl, event, {
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Don't throw on any status code
  });
}

/**
 * Start rate limiting for a specific test
 */
export async function startRateLimiting(testName: string): Promise<AxiosResponse> {
  const rateLimitUrl = 'http://localhost:8004/start_rate_limiting';
  return axios.post(rateLimitUrl, { test_name: testName }, {
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Don't throw on any status code
  });
}

/**
 * Assert that a value exists (is not null or undefined)
 */
export function assertExists(value: any, fieldName: string, context?: string): void {
  const contextStr = context ? ` ${context}` : '';
  if (value === null || value === undefined) {
    throw new Error(`Expected ${fieldName} to exist${contextStr}, but it was ${value}`);
  }
}

/**
 * Assert that a string starts with a prefix
 */
export function assertStartsWith(
  actual: string,
  prefix: string,
  fieldName: string,
  context?: string
): void {
  const contextStr = context ? ` ${context}` : '';
  if (!actual || typeof actual !== 'string') {
    throw new Error(
      `Expected ${fieldName} to be a string starting with "${prefix}"${contextStr}, but got: ${typeof actual}`
    );
  }
  if (!actual.startsWith(prefix)) {
    throw new Error(
      `Expected ${fieldName} to start with "${prefix}"${contextStr}, but got: "${actual}"`
    );
  }
}

/**
 * Assert array equality
 */
export function assertArrayEquals(
  actual: any[],
  expected: any[],
  fieldName: string,
  context?: string
): void {
  const contextStr = context ? ` ${context}` : '';
  if (!Array.isArray(actual)) {
    throw new Error(
      `Expected ${fieldName} to be an array${contextStr}, but got: ${typeof actual}`
    );
  }
  if (actual.length !== expected.length) {
    throw new Error(
      `Expected ${fieldName} to have length ${expected.length}${contextStr}, but got length ${actual.length}`
    );
  }
  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(
        `Expected ${fieldName}[${i}] to equal "${expected[i]}"${contextStr}, but got: "${actual[i]}"`
      );
    }
  }
}