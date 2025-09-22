import axios from 'axios';

export interface SnapInEvent {
  payload: {
    event_type: string;
    connection_data: {
      key: string;
      org_id: string;
      org_name?: string;
      key_type?: string;
    };
    event_context: {
      callback_url: string;
      external_sync_unit_id?: string;
      [key: string]: any;
    };
    event_data?: any;
  };
  context: {
    secrets: {
      service_account_token: string;
    };
    snap_in_version_id: string;
    [key: string]: any;
  };
  execution_metadata: {
    function_name: string;
    devrev_endpoint: string;
    request_id: string;
    [key: string]: any;
  };
  input_data: {
    global_values: {
      [key: string]: string;
    };
    event_sources: {
      [key: string]: string;
    };
  };
}

export class HttpClient {
  private snapInServerUrl: string;
  
  constructor(snapInServerUrl: string = 'http://localhost:8000/handle/sync') {
    this.snapInServerUrl = snapInServerUrl;
  }
  
  public async sendEvent(event: SnapInEvent): Promise<any> {
    try {
      const response = await axios.post(this.snapInServerUrl, event, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending event to Snap-In server:', error);
      throw error;
    }
  }
}