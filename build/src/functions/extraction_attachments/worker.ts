import {
  axios,
  axiosClient,
  ExternalSystemAttachmentStreamingParams,
  ExternalSystemAttachmentStreamingResponse,
  ExtractorEventType,
  processTask,
  serializeAxiosError,
} from '@devrev/ts-adaas';

/**
 * State interface for the attachments extraction process that extends SdkState
 */
interface AttachmentsExtractionState {
  completed: boolean;
  error?: string;
}

/**
 * Fetches and streams an attachment from its source URL
 * 
 * @param params - Parameters containing the attachment metadata
 * @returns Response containing either the HTTP stream or an error
 */
const getAttachmentStream = async ({
  item,
}: ExternalSystemAttachmentStreamingParams): Promise<ExternalSystemAttachmentStreamingResponse> => {
  const { id, url } = item;

  try {
    const fileStreamResponse = await axiosClient.get(url, {
      responseType: 'stream',
      headers: {
        'Accept-Encoding': 'identity',
      },
    });

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

/**
 * Worker file for handling attachments extraction
 */
processTask({
  task: async ({ adapter }) => {
    try {
      console.log('Starting attachments extraction');
      
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
        // Update state to indicate completion
        (adapter.state as any).completed = true;
        
        // Emit the attachments extraction done event
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
        
        console.log('Attachments extraction completed successfully');
      }
    } catch (error) {
      console.error('Error in attachments extraction:', error instanceof Error ? error.message : error);
      
      // Update state to indicate error
      (adapter.state as any).completed = false;
      (adapter.state as any).error = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during attachments extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Attachments extraction timed out');
    
    // Post the current state to preserve progress
    await adapter.postState();
    
    // Emit progress event on timeout
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, {
      progress: 50,
    });
  },
});