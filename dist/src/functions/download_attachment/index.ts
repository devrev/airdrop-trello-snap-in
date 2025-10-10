import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface DownloadAttachmentResult {
  attachment_data?: Buffer;
  status_code: number;
  api_delay: number;
  message: string;
}

/**
 * Function that downloads an attachment from Trello API.
 * 
 * @param events Array of function input events
 * @returns Object containing attachment data and API response info
 */
export async function run(events: FunctionInput[]): Promise<DownloadAttachmentResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: No events provided',
      };
    }

    const event = events[0];
    
    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing connection data',
      };
    }

    // Extract required parameters
    const globalValues = event.input_data.global_values;
    const idCard = globalValues?.idCard;
    const idAttachment = globalValues?.idAttachment;
    const fileName = globalValues?.fileName;

    if (!idCard) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing required idCard parameter',
      };
    }

    if (!idAttachment) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing required idAttachment parameter',
      };
    }

    if (!fileName) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Download attachment failed: Missing required fileName parameter',
      };
    }

    // Parse API credentials
    let credentials;
    try {
      credentials = TrelloClient.parseCredentials(connectionData.key);
    } catch (error) {
      return {
        status_code: 0,
        api_delay: 0,
        message: `Download attachment failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Initialize Trello client and download attachment
    const trelloClient = new TrelloClient({
      apiKey: credentials.apiKey,
      token: credentials.token,
    });

    const response = await trelloClient.downloadAttachment(idCard, idAttachment, fileName);

    const result: DownloadAttachmentResult = {
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: response.message,
    };

    // Include attachment data if successful
    if (response.status_code === 200 && response.data) {
      result.attachment_data = response.data;
    }

    return result;
  } catch (error) {
    console.error('Error in download_attachment function:', error);
    return {
      status_code: 0,
      api_delay: 0,
      message: `Download attachment failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}