import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface DownloadAttachmentResponse {
  status: 'success' | 'failure';
  status_code: number;
  api_delay: number;
  message: string;
  timestamp: string;
  file_data?: string; // Base64 encoded file content
  file_name?: string;
  content_type?: string;
}

/**
 * Download attachment function that downloads an attachment file from a Trello card.
 * Makes a request to /cards/{idCard}/attachments/{idAttachment}/download/{fileName} endpoint.
 */
const run = async (events: FunctionInput[]): Promise<DownloadAttachmentResponse> => {
  try {
    // Validate input
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    if (events.length === 0) {
      throw new Error('Invalid input: events array cannot be empty');
    }

    // Process only the first event as per requirements
    const event = events[0];

    // Validate event structure
    if (!event) {
      throw new Error('Invalid event: event cannot be null or undefined');
    }

    if (!event.payload) {
      throw new Error('Invalid event: missing payload');
    }

    if (!event.payload.connection_data) {
      throw new Error('Invalid event: missing connection_data in payload');
    }

    if (!event.payload.connection_data.key) {
      throw new Error('Invalid event: missing key in connection_data');
    }

    if (!event.input_data) {
      throw new Error('Invalid event: missing input_data');
    }

    if (!event.input_data.global_values) {
      throw new Error('Invalid event: missing global_values in input_data');
    }

    if (!event.input_data.global_values.idCard) {
      throw new Error('Invalid event: missing idCard in global_values');
    }

    if (!event.input_data.global_values.idAttachment) {
      throw new Error('Invalid event: missing idAttachment in global_values');
    }

    if (!event.input_data.global_values.fileName) {
      throw new Error('Invalid event: missing fileName in global_values');
    }

    // Extract parameters
    const idCard = event.input_data.global_values.idCard;
    const idAttachment = event.input_data.global_values.idAttachment;
    const fileName = event.input_data.global_values.fileName;

    // Create Trello client from connection data
    const trelloClient = TrelloClient.fromConnectionData(event.payload.connection_data.key);

    // Download attachment from Trello API
    const response = await trelloClient.downloadAttachment(idCard, idAttachment, fileName);

    const timestamp = new Date().toISOString();

    if (response.status_code === 200 && response.data) {
      // Successfully downloaded attachment
      return {
        status: 'success',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
        timestamp,
        file_data: response.data.file_data,
        file_name: response.data.file_name,
        content_type: response.data.content_type,
      };
    } else {
      // Failed to download attachment
      return {
        status: 'failure',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
        timestamp,
      };
    }
  } catch (error) {
    const timestamp = new Date().toISOString();
    
    // Log error for debugging purposes
    console.error('Download attachment function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during attachment download',
      timestamp,
    };
  }
};

export default run;