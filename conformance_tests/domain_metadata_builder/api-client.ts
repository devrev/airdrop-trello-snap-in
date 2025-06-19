import axios from 'axios';

const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

export interface SnapInResponse {
  function_result?: any;
  error?: any;
}

export async function callFunction(functionName: string, payload: any = {}): Promise<SnapInResponse> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, {
      execution_metadata: {
        function_name: functionName
      },
      payload
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error calling function ${functionName}:`, error);
    throw error;
  }
}