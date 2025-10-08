import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { axiosClient, ExternalSystemAttachmentStreamingResponse } from '@devrev/ts-adaas';
import { TrelloAuth, TrelloCredentials } from './trello-auth';
import { handleTrelloApiError } from './trello-error-handler';

export interface TrelloClientOptions {
  apiKey: string;
  token: string;
  baseURL?: string;
}

export interface TrelloApiResponse<T = any> {
  data?: T;
  status_code: number;
  api_delay: number;
  message: string;
}

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private auth: TrelloAuth;

  constructor(options: TrelloClientOptions) {
    this.auth = new TrelloAuth({
      apiKey: options.apiKey,
      token: options.token,
    });
    
    this.axiosInstance = axios.create({
      baseURL: options.baseURL || 'https://api.trello.com/1',
      timeout: 30000,
    });
  }

  /**
   * Get current authenticated member information
   */
  async getCurrentMember(): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get('/members/me', {
        params: {
          key: this.auth['apiKey'],
          token: this.auth['token'],
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully authenticated with Trello API',
      };
    } catch (error: any) {
      return handleTrelloApiError(error);
    }
  }

  /**
   * Get boards for a member
   */
  async getBoardsForMember(memberId: string = 'me'): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/members/${memberId}/boards`, {
        params: {
          key: this.auth['apiKey'],
          token: this.auth['token'],
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully fetched boards from Trello API',
      };
    } catch (error: any) {
      return handleTrelloApiError(error);
    }
  }

  /**
   * Get members of an organization
   */
  async getOrganizationMembers(organizationId: string): Promise<TrelloApiResponse> {
    try {
      const response: AxiosResponse = await this.axiosInstance.get(`/organizations/${organizationId}/members`, {
        params: {
          key: this.auth['apiKey'],
          token: this.auth['token'],
        },
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully fetched organization members from Trello API',
      };
    } catch (error: any) {
      const errorResponse = handleTrelloApiError(error);
      // Override generic 404 message for organization-specific context
      if (errorResponse.status_code === 404) {
        errorResponse.message = 'Organization not found';
      }
      return errorResponse;
    }
  }

  /**
   * Get cards for a board with pagination support
   */
  async getBoardCards(boardId: string, limit: number, before?: string): Promise<TrelloApiResponse> {
    try {
      const params: any = {
        key: this.auth['apiKey'],
        token: this.auth['token'],
        attachments: 'true',
        limit: limit,
      };

      if (before) {
        params.before = before;
      }

      const response: AxiosResponse = await this.axiosInstance.get(`/boards/${boardId}/cards`, {
        params,
      });

      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully fetched board cards from Trello API',
      };
    } catch (error: any) {
      const errorResponse = handleTrelloApiError(error);
      // Override generic 404 message for board-specific context
      if (errorResponse.status_code === 404) {
        errorResponse.message = 'Board not found';
      }
      return errorResponse;
    }
  }

  /**
   * Download an attachment file from a card using OAuth 1.0a authorization
   */
  async downloadAttachment(idCard: string, idAttachment: string, fileName: string): Promise<TrelloApiResponse<Buffer>> {
    try {
      // Generate OAuth 1.0a authorization header
      const authHeader = this.auth.generateOAuthHeader();
      
      const response: AxiosResponse = await this.axiosInstance.get(
        `/cards/${idCard}/attachments/${idAttachment}/download/${fileName}`,
        {
          headers: {
            'Authorization': authHeader,
          },
          responseType: 'arraybuffer', // Handle binary data
        }
      );

      // Convert ArrayBuffer to Buffer for proper JSON serialization
      const binaryData = Buffer.from(response.data);

      return {
        data: binaryData,
        status_code: response.status,
        api_delay: 0,
        message: 'Successfully downloaded attachment from Trello API',
      };
    } catch (error: any) {
      return handleTrelloApiError(error);
    }
  }

  /**
   * Stream an attachment from a URL with proper authentication
   */
  async streamAttachment(url: string): Promise<ExternalSystemAttachmentStreamingResponse> {
    try {
      const headers: any = {
        'Accept-Encoding': 'identity',
      };

      // If the URL is a Trello API URL, use OAuth 1.0a authorization
      if (url.includes('api.trello.com')) {
        headers['Authorization'] = this.auth.generateOAuthHeader();
      }

      const fileStreamResponse = await axiosClient.get(url, {
        responseType: 'stream',
        headers,
      });

      // Check if we were rate limited
      if (fileStreamResponse.status === 429) {
        const retryAfter = fileStreamResponse.headers['retry-after'];
        const delay = retryAfter ? Math.ceil((new Date(retryAfter).getTime() - Date.now()) / 1000) : 5;
        return { delay };
      }

      return { httpStream: fileStreamResponse };
    } catch (error) {
      console.error('Error streaming attachment:', error);
      return { error: { message: 'Error while fetching attachment from URL.' } };
    }
  }

  /**
   * Parse API key and token from connection data key field
   */
  static parseCredentials(connectionKey: string): TrelloCredentials {
    return TrelloAuth.parseCredentials(connectionKey);
  }
}