import {
  TrelloClientConfig,
  TrelloApiResponse,
  TrelloMember,
  TrelloBoard,
  TrelloOrganizationMember,
  TrelloCard,
  TrelloAttachmentDownload,
  TrelloAction,
} from './trello-types';
import { TrelloApiHandler } from './trello-api-handler';

// Re-export types for use by other modules
export {
  TrelloApiResponse,
  TrelloMember,
  TrelloBoard,
  TrelloOrganizationMember,
  TrelloCard,
  TrelloAttachmentDownload,
  TrelloAction,
} from './trello-types';

/**
 * Trello Internal Client for communicating with the Trello API.
 * Handles authentication, rate limiting, and API requests.
 */
export class TrelloClient extends TrelloApiHandler {
  constructor(config: TrelloClientConfig) {
    super(config.apiKey, config.token, config.baseUrl);
  }

  /**
   * Parses API key and token from connection data string.
   * Expected format: "key=<api_key>&token=<oauth_token>"
   */
  static parseConnectionData(connectionData: string): { apiKey: string; token: string } {
    try {
      const params = new URLSearchParams(connectionData);
      const apiKey = params.get('key');
      const token = params.get('token');

      if (!apiKey || !token) {
        throw new Error('Missing API key or token in connection data');
      }

      return { apiKey, token };
    } catch (error) {
      throw new Error(`Failed to parse connection data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a TrelloClient instance from connection data string.
   */
  static fromConnectionData(connectionData: string): TrelloClient {
    const { apiKey, token } = TrelloClient.parseConnectionData(connectionData);
    return new TrelloClient({ apiKey, token });
  }

  /**
   * Gets the current authenticated member information.
   * Used for authentication testing.
   */
  async getCurrentMember(): Promise<TrelloApiResponse<TrelloMember>> {
    return this.makeGetRequest<TrelloMember>(
      '/members/me',
      {},
      'Failed to get current member information'
    );
  }

  /**
   * Gets the boards that the authenticated user is a member of.
   * Used for fetching user's boards.
   */
  async getMemberBoards(): Promise<TrelloApiResponse<TrelloBoard[]>> {
    return this.makeGetRequest<TrelloBoard[]>(
      '/members/me/boards',
      {},
      'Failed to get member boards'
    );
  }

  /**
   * Gets the members of a specific organization.
   * Used for fetching organization members.
   */
  async getOrganizationMembers(organizationId: string): Promise<TrelloApiResponse<TrelloOrganizationMember[]>> {
    return this.makeGetRequest<TrelloOrganizationMember[]>(
      `/organizations/${organizationId}/members`,
      {},
      'Failed to get organization members'
    );
  }

  /**
   * Gets the cards on a specific board.
   * Used for fetching board cards with pagination support.
   */
  async getBoardCards(boardId: string, limit?: number, before?: string): Promise<TrelloApiResponse<TrelloCard[]>> {
    const params: any = { attachments: 'true' };
    if (limit !== undefined) {
      params.limit = limit;
    }
    if (before) {
      params.before = before;
    }

    return this.makeGetRequest<TrelloCard[]>(
      `/boards/${boardId}/cards`,
      params,
      'Failed to get board cards'
    );
  }

  /**
   * Gets the actions for a specific card.
   * Used for fetching card creation information.
   */
  async getCardActions(cardId: string, filter?: string, fields?: string): Promise<TrelloApiResponse<TrelloAction[]>> {
    const params: any = {};
    if (filter) params.filter = filter;
    if (fields) params.fields = fields;

    return this.makeGetRequest<TrelloAction[]>(
      `/cards/${cardId}/actions`,
      params,
      'Failed to get card actions'
    );
  }

  /**
   * Downloads an attachment file from a card.
   * Uses OAuth 1.0a authentication as required by this endpoint.
   */
  async downloadAttachment(idCard: string, idAttachment: string, fileName: string): Promise<TrelloApiResponse<TrelloAttachmentDownload>> {
    // Create OAuth 1.0a Authorization header
    const authHeader = `OAuth oauth_consumer_key="${this.apiKey}", oauth_token="${this.token}"`;
    
    const response = await this.makeBinaryGetRequest(
      `/cards/${idCard}/attachments/${idAttachment}/download/${fileName}`,
      { 'Authorization': authHeader },
      'Failed to download attachment'
    );

    if (response.status_code === 200 && response.data) {
      // Convert binary data to base64
      const fileData = Buffer.from(response.data).toString('base64');
      const contentType = response.headers?.['content-type'] || 'application/octet-stream';
      const contentLength = response.headers?.['content-length'];
      
      const attachmentData: TrelloAttachmentDownload = {
        file_data: fileData,
        file_name: fileName,
        content_type: contentType,
        ...(contentLength && { file_size: parseInt(contentLength, 10) }),
      };
      
      return {
        data: attachmentData,
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: 'Successfully downloaded attachment',
      };
    }

    return response as any as TrelloApiResponse<TrelloAttachmentDownload>;
  }
}