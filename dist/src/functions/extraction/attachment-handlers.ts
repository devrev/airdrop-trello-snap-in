import { ExtractorEventType, ExternalSystemAttachmentStreamingParams, ExternalSystemAttachmentStreamingResponse, axios, axiosClient, serializeAxiosError } from '@devrev/ts-adaas';
import { ExtractorState } from './extraction-handlers';

/**
 * Handles attachment extraction by fetching and streaming attachments from Trello.
 * This function is called when the EXTRACTION_ATTACHMENTS_START or EXTRACTION_ATTACHMENTS_CONTINUE event is received.
 */
export async function handleAttachmentsExtraction(adapter: any): Promise<void> {
  console.log('Processing attachments extraction task');
  
  try {
    // Initialize state if it doesn't exist
    if (!adapter.state.attachments) {
      adapter.state = {
        ...adapter.state,
        attachments: { completed: false }
      };
    }
    
    // Check if attachments extraction is already completed
    if (adapter.state.attachments.completed) {
      console.log('Attachments already processed, skipping extraction');
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
      return;
    }
    
    // Stream the attachments - ensure this is called in all test scenarios
    const response = await adapter.streamAttachments({
      stream: getAttachmentStream,
    });
    
    // Handle the response
    if (response?.delay) {
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsDelay, {
        delay: response.delay,
      });
      console.log(`Attachment extraction delayed for ${response.delay} seconds`);
    } else if (response?.error) {
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
        error: response.error,
      });
      console.error('Error during attachment extraction:', response.error);
    } else {
      // Mark attachments as completed
      adapter.state = {
        ...adapter.state,
        attachments: { completed: true }
      };
      
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
      console.log('Attachments extraction task completed successfully');
    }
  } catch (error) {
    console.error('Error during attachments extraction:', error);
    // Emit error event
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error during attachments extraction',
      },
    });
  }
}

/**
 * Fetches and streams an attachment from Trello.
 * This function is called by the adapter.streamAttachments method.
 */
export const getAttachmentStream = async ({
  item,
  event, // Include event parameter to match the ExternalSystemAttachmentStreamingParams interface
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
    console.warn(`Error while fetching attachment ${id} from URL.`, axios.isAxiosError(error) ? serializeAxiosError(error) : error);
    console.warn('Failed attachment metadata', item);
    return { error: { message: `Error while fetching attachment ${id} from URL.` } };
  }
};