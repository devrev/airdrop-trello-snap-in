import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { TrelloClientConfig, TrelloApiResponse, sanitizeResponse, handleApiError } from './trello-utils';

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private apiKey: string;
  private token: string;

  constructor(config: TrelloClientConfig) {
    this.apiKey = config.apiKey;
    this.token = config.token;
    
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
    });
  }

  /**
   * Get member information by ID
   * @param memberId The member ID (use "me" for current authenticated user)
   * @returns Promise with member data and API response metadata
   */
  async getMember(memberId: string): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/members/${memberId}`, {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully retrieved member information',
        raw_response: sanitizeResponse(response),
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to retrieve member information');
    }
  }

  /**
   * Get boards for a member
   * @param memberId The member ID (use "me" for current authenticated user)
   * @returns Promise with boards data and API response metadata
   */
  async getMemberBoards(memberId: string): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/members/${memberId}/boards`, {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully retrieved boards',
        raw_response: sanitizeResponse(response),
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to retrieve boards');
    }
  }

  /**
   * Get members of an organization
   * @param organizationId The organization ID
   * @returns Promise with organization members data and API response metadata
   */
  async getOrganizationMembers(organizationId: string): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/organizations/${organizationId}/members`, {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully retrieved organization members',
        raw_response: sanitizeResponse(response),
      };
    } catch (error) {
      return handleApiError(
        error as AxiosError, 
        'Failed to retrieve organization members'
      );
    }
  }

  /**
   * Get cards for a board
   * @param boardId The board ID
   * @param options Optional parameters (limit, before)
   * @returns Promise with cards data and API response metadata
   */
  async getBoardCards(boardId: string, options: { limit?: number; before?: string } = {}): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/boards/${boardId}/cards`, {
        params: {
          key: this.apiKey,
          token: this.token,
          limit: options.limit,
          before: options.before,
          attachments: true
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully retrieved board cards',
        raw_response: sanitizeResponse(response),
      };
    } catch (error) {
      return handleApiError(
        error as AxiosError, 
        'Failed to retrieve board cards'
      );
    }
  }

  /**
   * Download an attachment from a card
   * @param idCard The card ID
   * @param idAttachment The attachment ID
   * @param fileName The original filename of the attachment
   * @returns Promise with attachment data and API response metadata
   */
  async downloadAttachment(idCard: string, idAttachment: string, fileName: string): Promise<TrelloApiResponse> {
    try {
      // This endpoint requires OAuth 1.0a authorization with oauth_consumer_key and oauth_token
      // encoded in the Authorization header
      const authHeader = `OAuth oauth_consumer_key="${this.apiKey}", oauth_token="${this.token}"`;
      
      const config: AxiosRequestConfig = {
        headers: {
          Authorization: authHeader
        },
        responseType: 'arraybuffer'
      };

      const response: AxiosResponse = await this.axiosInstance.get(
        `/cards/${idCard}/attachments/${idAttachment}/download/${fileName}`,
        config
      );

      // Convert binary data to base64
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const content = Buffer.from(response.data).toString('base64');

      return {
        data: {
          content,
          contentType,
          fileName
        },
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully downloaded attachment',
        raw_response: sanitizeResponse(response),
      };
    } catch (error) {
      return handleApiError(error as AxiosError, 'Failed to download attachment');
    }
  }
}

// Re-export from trello-utils for backward compatibility
export { TrelloApiResponse, TrelloClientConfig, parseApiCredentials } from './trello-utils';