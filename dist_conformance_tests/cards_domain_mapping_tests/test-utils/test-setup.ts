import * as http from 'http';
import axios from 'axios';

export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
  chefCliPath: string;
}

export interface CallbackServer {
  server: http.Server;
  port: number;
  receivedEvents: any[];
  close: () => Promise<void>;
}

export function getTestEnvironment(): TestEnvironment {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID;
  const chefCliPath = process.env.CHEF_CLI_PATH;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!trelloOrganizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }
  if (!chefCliPath) {
    throw new Error('CHEF_CLI_PATH environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId,
    chefCliPath,
  };
}

export function createCallbackServer(): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    const receivedEvents: any[] = [];
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const event = JSON.parse(body);
            receivedEvents.push(event);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'received' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          server,
          port: 8002,
          receivedEvents,
          close: () => new Promise((resolveClose) => {
            server.close(() => resolveClose());
          }),
        });
      }
    });
  });
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = `Snap-in server request failed: ${error.message}`;
      const statusInfo = error.response?.status ? `. Status: ${error.response.status}` : '';
      const dataInfo = error.response?.data ? `. Data: ${JSON.stringify(error.response.data)}` : '';
      const fullError = errorMessage + statusInfo + dataInfo;
      console.error('Snap-in request error details:', { error: error.message, status: error.response?.status, data: error.response?.data });
      throw new Error(fullError);
    }
    throw error;
  }
}