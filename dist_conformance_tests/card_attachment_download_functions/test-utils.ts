import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';

// Environment variables
export const getEnvVars = () => {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_ORGANIZATION_ID');
  }

  return { trelloApiKey, trelloToken, trelloOrgId };
};

// Server setup
export const setupCallbackServer = (port = 8002) => {
  const app = express();
  app.use(bodyParser.json());
  
  const callbacks: any[] = [];
  
  app.post('*', (req, res) => {
    callbacks.push(req.body);
    res.status(200).send({ success: true });
  });
  
  const server = app.listen(port);
  
  return {
    close: () => server.close(),
    getCallbacks: () => [...callbacks],
    clearCallbacks: () => { callbacks.length = 0; }
  };
};

// Base event payload
export const createBaseEvent = () => {
  const { trelloApiKey, trelloToken, trelloOrgId } = getEnvVars();
  
  return {
    payload: {
      connection_data: {
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        org_id: trelloOrgId,
        org_name: "Test Organization"
      }
    },
    context: {
      dev_oid: "dev_oid",
      source_id: "source_id",
      snap_in_id: "snap_in_id",
      snap_in_version_id: "snap_in_version_id",
      service_account_id: "service_account_id",
      secrets: {
        service_account_token: "service_account_token"
      }
    },
    execution_metadata: {
      request_id: "request_id",
      function_name: "download_attachment",
      event_type: "event_type",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
};

// Send request to snap-in server
export const sendToSnapInServer = async (event: any) => {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event);
    return response.data;
  } catch (error) {
    console.error('Error sending request to snap-in server:', error);
    throw error;
  }
};

// Rate limiting control functions
export const startRateLimiting = async (testName: string) => {
  try {
    const response = await axios.post('http://localhost:8004/start_rate_limiting', { 
      test_name: testName 
    });
    return response.data;
  } catch (error) {
    console.error('Error starting rate limiting:', error);
    throw error;
  }
};

export const endRateLimiting = async () => {
  try {
    const response = await axios.post('http://localhost:8004/end_rate_limiting');
    return response.data;
  } catch (error) {
    console.error('Error ending rate limiting:', error);
    throw error;
  }
};