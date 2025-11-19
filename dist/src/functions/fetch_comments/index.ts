import { FunctionInput } from '../../core/types';
import { TrelloClient, parseConnectionData } from '../../core/trello-client';

export interface Comment {
  id: string;
  body: string[];
  parent_object_id: string;
  created_by_id: string;
  modified_date: string;
  grandparent_object_id: string;
  grandparent_object_type: string;
  creator_display_name: string;
  parent_object_type: string;
}

/**
 * Convert text to rich text format by splitting by newlines and filtering empty lines
 */
function convertToRichText(text: string): string[] {
  if (!text) {
    return [];
  }
  return text.split('\n').filter(line => line.trim() !== '');
}

/**
 * Fetch all comments for a Trello card
 */
const run = async (events: FunctionInput[]) => {
  // Process only the first event
  if (events.length === 0) {
    return {
      status_code: 400,
      api_delay: 0,
      message: 'No events to process',
    };
  }

  const event = events[0];

  // Validate event structure
  if (!event || !event.payload || !event.payload.connection_data) {
    const error = new Error('Invalid event structure: missing connection_data');
    console.error(error.message);
    throw error;
  }

  try {
    // Parse credentials from connection data
    const connectionDataKey = event.payload.connection_data.key;
    const cardId = event.input_data?.global_values?.idCard;

    if (!connectionDataKey) {
      const error = new Error('Missing connection data key');
      console.error(error.message);
      throw error;
    }

    if (!cardId) {
      const error = new Error('Missing card ID');
      console.error(error.message);
      throw error;
    }

    const credentials = parseConnectionData(connectionDataKey);

    // Initialize Trello client
    const trelloClient = new TrelloClient(credentials);

    // Fetch comments
    const response = await trelloClient.getComments(cardId);

    // Handle rate limiting
    if (response.status_code === 429) {
      // Ensure api_delay is a valid number
      const apiDelay = typeof response.api_delay === 'number' && !isNaN(response.api_delay)
        ? response.api_delay
        : 3;

      return {
        status_code: response.status_code,
        api_delay: apiDelay,
        message: response.message,
      };
    }

    // Handle API errors
    if (response.status_code !== 200 || !response.data) {
      return {
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
      };
    }

    // Map comments according to ObjectPRD
    const comments: Comment[] = response.data.map((comment: any) => ({
      id: comment.id,
      body: convertToRichText(comment.data?.text || ''),
      parent_object_id: comment.data?.idCard || '',
      created_by_id: comment.idMemberCreator || '',
      modified_date: comment.data?.dateLastEdited || comment.date || '',
      grandparent_object_id: comment.data?.board?.id || '',
      grandparent_object_type: 'board',
      creator_display_name: comment.memberCreator?.username || '',
      parent_object_type: 'issue',
    }));

    return {
      status_code: 200,
      api_delay: 0,
      message: `Successfully fetched ${comments.length} comments`,
      data: comments,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch_comments:', errorMessage);
    throw error;
  }
};

export default run;