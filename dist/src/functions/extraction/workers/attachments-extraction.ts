import {
  axios,
  axiosClient,
  ExternalSystemAttachmentStreamingParams,
  ExternalSystemAttachmentStreamingResponse,
  ExtractorEventType,
  processTask,
  serializeAxiosError,
} from '@devrev/ts-adaas';
import { TrelloClient, parseConnectionData } from '../../../core/trello-client';

/**
 * Stream attachment from Trello
 */
const getAttachmentStream = async ({
  item,
  event,
}: ExternalSystemAttachmentStreamingParams): Promise<ExternalSystemAttachmentStreamingResponse> => {
  const { id } = item;
  const { url, file_name, parent_id } = item;

  // Parse connection data to get credentials
  const connectionDataKey = event.payload.connection_data.key;
  if (!connectionDataKey) {
    console.warn(`Missing connection data for attachment ${id}`);
    return {
      error: {
        message: `Missing connection data for attachment ${id}`,
      },
    };
  }

  const credentials = parseConnectionData(connectionDataKey);
  const trelloClient = new TrelloClient(credentials);

  try {
    // Check if URL is a Trello attachment that needs OAuth authentication
    if (url.startsWith('https://api.trello.com/1/cards/')) {
      // Extract cardId, attachmentId, and fileName from URL
      // URL format: https://api.trello.com/1/cards/{cardId}/attachments/{attachmentId}/download/{fileName}
      const urlParts = url.split('/');
      const cardIdIndex = urlParts.indexOf('cards') + 1;
      const attachmentIdIndex = urlParts.indexOf('attachments') + 1;
      const fileNameIndex = urlParts.indexOf('download') + 1;

      const cardId = urlParts[cardIdIndex];
      const attachmentId = urlParts[attachmentIdIndex];
      const fileName = file_name || urlParts.slice(fileNameIndex).join('/');

      // Download using OAuth 1.0a authentication
      const response = await trelloClient.downloadAttachment(cardId, attachmentId, fileName);

      // Check for rate limiting
      if (response.status_code === 429) {
        return {
          delay: response.api_delay,
        };
      }

      // Check for errors
      if (response.status_code !== 200 || !response.data) {
        console.warn(`Error downloading attachment ${id}: ${response.message}`);
        return {
          error: {
            message: `Error downloading attachment ${id}: ${response.message}`,
          },
        };
      }

      return { httpStream: response.data };
    } else {
      // External URL - download directly without authentication
      const fileStreamResponse = await axiosClient.get(url, {
        responseType: 'stream',
        headers: {
          'Accept-Encoding': 'identity',
        },
      });

      return { httpStream: fileStreamResponse };
    }
  } catch (error) {
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
      console.error('An error occurred while processing attachment streaming task.', error);
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during attachment streaming',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, {
      progress: 50,
    });
  },
});