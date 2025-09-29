import express from 'express';
import axios from 'axios';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface TestServers {
  callbackServer: Server;
  callbackPort: number;
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
    );
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID,
  };
}

export function setupCallbackServer(): Promise<TestServers> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());

    const callbackPort = 8002;
    const callbackServer = app.listen(callbackPort, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          callbackServer,
          callbackPort,
        });
      }
    });
  });
}

export function teardownServers(servers: TestServers): Promise<void> {
  return new Promise((resolve) => {
    servers.callbackServer.close(() => {
      resolve();
    });
  });
}

export async function callSnapInFunction(
  functionName: string,
  eventPayload: any
): Promise<any> {
  const response = await axios.post(
    'http://localhost:8000/handle/sync',
    {
      ...eventPayload,
      execution_metadata: {
        ...eventPayload.execution_metadata,
        function_name: functionName,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data;
}