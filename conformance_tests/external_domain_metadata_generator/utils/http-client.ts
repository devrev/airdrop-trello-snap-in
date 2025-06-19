import axios, { AxiosResponse, AxiosRequestConfig, CancelTokenSource } from 'axios';

/**
 * Makes a POST request to the Test Snap-In Server
 * 
 * @param functionName - The name of the function to invoke
 * @param payload - The payload to send with the request
 * @returns The response from the server
 */
export async function invokeFunction(functionName: string, payload: any = {}): Promise<AxiosResponse> {
  const requestBody = {
    execution_metadata: {
      function_name: functionName
    },
    payload: payload,
    context: {
      secrets: {
        service_account_token: 'test-token'
      }
    }
  };
  
  const config: AxiosRequestConfig = {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000, // Add a timeout to prevent hanging requests
  };

  // Create a cancel token source for the request
  const source = axios.CancelToken.source();
  config.cancelToken = source.token;
  
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', requestBody, config);
    // Clean up the source to prevent memory leaks
    return response;
  } catch (error: any) {
    console.error(`Error invoking function ${functionName}:`, error);
    // Cancel the request if it's still pending
    if (axios.isCancel(error)) {
      console.log('Request canceled:', error.message);
    } else {
      source.cancel('Operation canceled by the user');
    }
    throw error;
  }
}

/**
 * Reads required environment variables
 * 
 * @returns Object containing the environment variables
 */
export function getEnvironmentVariables(): { 
  trelloApiKey: string; 
  trelloToken: string; 
  trelloOrgId: string 
} {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }

  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }

  if (!trelloOrgId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrgId
  };
}