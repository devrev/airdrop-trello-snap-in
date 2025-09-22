import { TrelloClient, parseApiCredentials, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

export interface DownloadAttachmentResult {
  success: boolean;
  status_code: number;
  api_delay: number;
  message: string;
  raw_response: any;
  attachment_data?: string; // Base64 encoded attachment data
  content_type?: string;
}

/**
 * Function that downloads an attachment from a Trello card.
 * 
 * @param events Array of function input events
 * @returns Object containing the downloaded attachment data and API response metadata
 */
export async function run(events: FunctionInput[]): Promise<DownloadAttachmentResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: No events provided',
        raw_response: null,
      };
    }

    const event = events[0];
    
    // Validate required environment variable
    const baseUrl = process.env.TRELLO_BASE_URL;
    if (!baseUrl) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: TRELLO_BASE_URL environment variable not set',
        raw_response: null,
      };
    }

    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing connection data or API key',
        raw_response: null,
      };
    }

    // Get required parameters from global_values
    const idCard = event.input_data?.global_values?.idCard;
    const idAttachment = event.input_data?.global_values?.idAttachment;
    const fileName = event.input_data?.global_values?.fileName;

    // Validate required parameters
    if (!idCard) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing idCard parameter',
        raw_response: null,
      };
    }

    if (!idAttachment) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing idAttachment parameter',
        raw_response: null,
      };
    }

    if (!fileName) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing fileName parameter',
        raw_response: null,
      };
    }

    // Parse API credentials
    let apiCredentials;
    try {
      apiCredentials = parseApiCredentials(connectionData.key);
    } catch (error) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: `Download attachment failed: ${error instanceof Error ? error.message : String(error)}`,
        raw_response: null,
      };
    }

    // Initialize Trello client
    const trelloClient = new TrelloClient({
      baseUrl: baseUrl,
      apiKey: apiCredentials.apiKey,
      token: apiCredentials.token,
    });

    // Download the attachment
    const response: TrelloApiResponse = await trelloClient.downloadAttachment(idCard, idAttachment, fileName);

    // Determine success based on response
    const success = response.status_code === 200 && !!response.data;

    return {
      success: success,
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: success 
        ? `Successfully downloaded attachment: ${fileName}`
        : response.message,
      raw_response: response.raw_response,
      attachment_data: success ? response.data.content : undefined,
      content_type: success ? response.data.contentType : undefined,
    };

  } catch (error) {
    console.error('Error in download_attachment function:', error);
    return {
      success: false,
      status_code: 0,
      api_delay: 0,
      message: `Download attachment failed: ${error instanceof Error ? error.message : String(error)}`,
      raw_response: null,
    };
  }
}