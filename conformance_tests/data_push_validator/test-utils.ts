import axios from 'axios';

export interface AirdropEvent {
  execution_metadata: {
    function_name: string;
    devrev_endpoint: string;
  };
  context: {
    snap_in_id: string;
    secrets?: {
      service_account_token?: string;
    };
  };
  payload: {
    event_type: string;
    event_context: {
      callback_url?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export async function callSnapInFunction(
  functionName: string,
  eventContext: Record<string, any> = {}
): Promise<any> {
  const event: AirdropEvent = {
    execution_metadata: {
      function_name: functionName,
      devrev_endpoint: 'http://localhost:8003',
    },
    context: {
      snap_in_id: 'test-snap-in-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    payload: {
      event_type: 'test_event',
      event_context: eventContext,
    },
  };

  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}