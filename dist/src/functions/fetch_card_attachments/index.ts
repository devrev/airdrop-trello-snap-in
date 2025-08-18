import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

/**
 * Function to fetch attachments for a specific card from Trello API.
 * Uses the endpoint "/cards/{id}/attachments".
 * 
 * @param events Array of function input events
 * @returns A success or error message with the list of attachments if successful
 */
export async function fetch_card_attachments(events: FunctionInput[]): Promise<{ status: string, message: string, attachments?: any[] }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Fetch card attachments function invoked with request ID: ${requestId}`);

    // Get card ID from payload
    const cardId = event.payload.card_id;
    if (!cardId) {
      throw new Error('Card ID not found in payload');
    }

    // Initialize the Trello client
    const trelloClient = new TrelloClient(event);
    
    // Fetch the attachments for the card
    const attachments = await trelloClient.getCardAttachments(cardId);
    
    console.log(`Successfully fetched ${attachments.length} attachments from card ${cardId}`);
    
    // Return success with attachments information
    return {
      status: 'success',
      message: `Successfully fetched ${attachments.length} attachments from card`,
      attachments: attachments.map(attachment => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        mime_type: attachment.mimeType || '',
        date_created: attachment.date,
        bytes: attachment.bytes,
        is_upload: attachment.isUpload,
        member_id: attachment.idMember
      }))
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in fetch_card_attachments function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Failed to fetch card attachments: ${error.message}` 
        : 'Failed to fetch card attachments: Unknown error'
    };
  }
}