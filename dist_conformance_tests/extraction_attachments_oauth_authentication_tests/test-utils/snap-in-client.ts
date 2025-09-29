import axios from 'axios';

export interface SnapInResponse {
  success: boolean;
  message: string;
  function_result?: any;
  error?: any;
}

export class SnapInClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async callFunction(functionName: string, event: any): Promise<SnapInResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/handle/sync`, {
        ...event,
        execution_metadata: {
          ...event.execution_metadata,
          function_name: functionName
        }
      });

      // Extract the actual function result from the response
      const functionResult = response.data.function_result;
      
      return {
        success: functionResult?.success ?? true,
        message: functionResult?.message ?? 'Function executed successfully',
        function_result: functionResult
      };
    } catch (error: any) {
      console.error('SnapInClient error:', error.response?.data || error.message);
      return {
        success: false,
        message: `Function execution failed: ${error.message}`,
        error: error.response?.data || error.message
      };
    } finally {
      // Ensure axios doesn't keep connections open
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}