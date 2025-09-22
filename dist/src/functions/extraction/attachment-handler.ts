import { 
  ExternalSystemAttachmentStreamingParams,
  ExternalSystemAttachmentStreamingResponse,
  axiosClient,
  axios,
  serializeAxiosError
} from '@devrev/ts-adaas';

/**
 * Attachment stream handler for streaming attachments from Trello
 */
export const getAttachmentStream = async ({
  item,
}: ExternalSystemAttachmentStreamingParams): Promise<ExternalSystemAttachmentStreamingResponse> => {
  const { id, url } = item;

  try {
    // Get API credentials from environment or connection data
    const baseUrl = process.env.TRELLO_BASE_URL;
    if (!baseUrl) {
      throw new Error('TRELLO_BASE_URL environment variable not set');
    }

    // Parse API key and token from the URL or use connection data
    // For Trello attachments, we need to use OAuth 1.0a authorization
    const urlParams = new URL(url).searchParams;
    const apiKey = urlParams.get('key') || process.env.TRELLO_API_KEY;
    const token = urlParams.get('token') || process.env.TRELLO_TOKEN;

    if (!apiKey || !token) {
      throw new Error('Missing API key or token for attachment streaming');
    }

    const authHeader = `OAuth oauth_consumer_key="${apiKey}", oauth_token="${token}"`;
    
    const fileStreamResponse = await axiosClient.get(url, {
      responseType: 'stream',
      headers: {
        'Accept-Encoding': 'identity',
        'Authorization': authHeader
      },
    });

    // Check if we were rate limited
    if (fileStreamResponse.status === 429) {
      const retryAfter = fileStreamResponse.headers['retry-after'];
      const delay = retryAfter ? (isNaN(Number(retryAfter)) ? 
        Math.max(0, Math.ceil((new Date(retryAfter).getTime() - new Date().getTime()) / 1000)) : 
        parseInt(retryAfter, 10)) : 30;
      return { delay: delay };
    }

    return { httpStream: fileStreamResponse };
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