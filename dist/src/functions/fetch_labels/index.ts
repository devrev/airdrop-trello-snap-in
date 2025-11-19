import { FunctionInput } from '../../core/types';
import { TrelloClient, parseConnectionData } from '../../core/trello-client';

export interface Label {
  name: string;
  style: string;
  description: string;
}

/**
 * Convert Trello color to hex code according to ColorToHexCodeConversionRule
 */
function convertColorToHex(color: string): string {
  const colorToHex: Record<string, string> = {
    green: '#008000',
    blue: '#0000FF',
    orange: '#FFA500',
    purple: '#800080',
    red: '#FF0000',
    yellow: '#FFFF00',
    black: '#000000',
    white: '#FFFFFF',
    gray: '#808080',
    brown: '#A52A2A',
    pink: '#FFC0CB',
    cyan: '#00FFFF',
    magenta: '#FF00FF',
    lime: '#00FF00',
    navy: '#000080',
    maroon: '#800000',
    olive: '#808000',
    teal: '#008080',
    silver: '#C0C0C0',
  };

  return colorToHex[color.toLowerCase()] || '#000000';
}

/**
 * Fetch all labels from a Trello board
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
    const boardId = event.payload.board_id;

    if (!connectionDataKey) {
      const error = new Error('Missing connection data key');
      console.error(error.message);
      throw error;
    }

    if (!boardId) {
      const error = new Error('Missing board ID');
      console.error(error.message);
      throw error;
    }

    const credentials = parseConnectionData(connectionDataKey);

    // Initialize Trello client
    const trelloClient = new TrelloClient(credentials);

    // Fetch labels
    const response = await trelloClient.getLabels(boardId);

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

    // Map labels according to ObjectPRD
    const labels: Label[] = response.data.map((label: any) => {
      const labelName = label.name || `label-${label.color}`;
      return {
        name: labelName,
        style: convertColorToHex(label.color),
        description: labelName,
      };
    });

    return {
      status_code: 200,
      api_delay: 0,
      message: `Successfully fetched ${labels.length} labels`,
      data: labels,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch_labels:', errorMessage);
    throw error;
  }
};

export default run;