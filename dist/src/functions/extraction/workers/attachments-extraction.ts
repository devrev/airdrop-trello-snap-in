import {
  processTask,
  ExtractorEventType,
  ExternalSystemAttachmentStreamingParams,
  ExternalSystemAttachmentStreamingResponse,
  axiosClient,
  axios,
  serializeAxiosError,
} from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';

/**
 * Handles streaming of individual attachments from Trello
 */
const getAttachmentStream = async ({
  item,
  event,
}: ExternalSystemAttachmentStreamingParams): Promise<ExternalSystemAttachmentStreamingResponse> => {
  const { id, url } = item;

  try {
    // Get connection data for OAuth authentication
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        error: {
          message: 'Missing connection data or API key for attachment ' + id,
        },
      };
    }

    // Parse API key and token for OAuth 1.0a
    const { apiKey, token } = TrelloClient.parseConnectionData(connectionData.key);
    
    // Create OAuth 1.0a Authorization header
    const authHeader = `OAuth oauth_consumer_key="${apiKey}", oauth_token="${token}"`;

    // Make authenticated request to download attachment
    const fileStreamResponse = await axiosClient.get(url, {
      responseType: 'stream',
      headers: {
        'Accept-Encoding': 'identity',
        'Authorization': authHeader,
      },
    });

    // Check if we were rate limited
    if (fileStreamResponse.status === 429) {
      const retryAfter = fileStreamResponse.headers?.['retry-after'];
      let delay = 60; // Default delay
      
      if (retryAfter) {
        if (/^\d+$/.test(retryAfter)) {
          delay = parseInt(retryAfter, 10);
        } else {
          // HTTP date format - calculate seconds until that time
          const retryDate = new Date(retryAfter);
          const now = new Date();
          delay = Math.max(0, Math.ceil((retryDate.getTime() - now.getTime()) / 1000));
        }
      }
      
      return { delay };
    }

    // Return the stream response
    return { httpStream: fileStreamResponse };
  } catch (error) {
    // Error handling logic
    if (axios.isAxiosError(error)) {
      console.warn(`Error while fetching attachment ${id} from URL.`, serializeAxiosError(error));
      console.warn('Failed attachment metadata', item);
    } else {
      console.warn(`Error while fetching attachment ${id} from URL.`, error);
      console.warn('Failed attachment metadata', item);
    }

    return {
      error: {
        message: 'Error while fetching attachment ' + id + ' from URL.',
      },
    };
  }
};
  
processTask({
  task: async ({ adapter }) => {
    try {
      const response = await adapter.streamAttachments({
        stream: getAttachmentStream,
      });

      // Handle different response scenarios
      if (response?.delay) {
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsDelay, {
          delay: response.delay,
        });
      } else if (response?.error) {
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
          error: response.error,
        });
      } else {
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
      }
    } catch (error) {
      console.error('An error occurred while processing attachments extraction task:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred during attachments extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    try {
      console.error('Attachments extraction timeout');
      
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, {
        progress: 50,
      });
    } catch (error) {
      console.error('Error handling timeout in attachments extraction:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  },
});