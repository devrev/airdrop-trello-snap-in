import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { FunctionInput } from './types';

/**
 * TrelloClient is responsible for making authenticated requests to the Trello API.
 * It extracts the API key and token from the connection data and provides methods
 * for interacting with the Trello API.
 */
export class TrelloClient {
  private apiKey: string;
  private token: string;
  private client: AxiosInstance;

  /**
   * Creates a new TrelloClient instance.
   * 
   * @param event The function input event containing connection data
   * @throws Error if API key or token cannot be extracted
   */
  constructor(event: FunctionInput) {
    const connectionData = event.payload.connection_data;
    
    if (!connectionData || !connectionData.key) {
      throw new Error('Missing connection data or API key');
    }

    // Extract API key and token from the connection data
    // Format: "key=<api_key>&token=<token>"
    const keyString = connectionData.key as string;
    const keyMatch = keyString.match(/key=([^&]+)/);
    const tokenMatch = keyString.match(/token=([^&]+)/);

    if (!keyMatch || !tokenMatch) {
      throw new Error('Invalid API key format. Expected format: key=<api_key>&token=<token>');
    }

    this.apiKey = keyMatch[1];
    this.token = tokenMatch[1];

    // Initialize axios client with base URL
    this.client = axios.create({
      baseURL: 'https://api.trello.com/1',
    });
  }

  /**
   * Gets the current authenticated member's information.
   * 
   * @returns Promise resolving to the member data
   * @throws Error if the request fails
   */
  async getCurrentMember(): Promise<any> {
    try {
      const response = await this.client.get('/members/me', {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        throw new Error(`Trello API error (${status}): ${message}`);
      }
      throw error;
    }
  }

  /**
   * Gets the list of boards for the current authenticated member.
   * 
   * @returns Promise resolving to an array of board data
   * @throws Error if the request fails
   */
  async getBoards(): Promise<any[]> {
    try {
      const response = await this.client.get('/members/me/boards', {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch boards');
    }
  }

  /**
   * Gets the list of members for a specific organization.
   * 
   * @param orgId The ID of the organization
   * @returns Promise resolving to an array of member data
   * @throws Error if the request fails
   */
  async getOrganizationMembers(orgId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/organizations/${orgId}/members`, {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch organization members');
    }
  }

  /**
   * Gets the list of cards for a specific board with pagination support.
   * 
   * @param boardId The ID of the board
   * @param limit The maximum number of cards to return
   * @param before Optional card ID to get cards before
   * @returns Promise resolving to an array of card data
   * @throws Error if the request fails
   */
  async getBoardCards(boardId: string, limit: number, before?: string): Promise<any[]> {
    try {
      const params: Record<string, any> = {
        key: this.apiKey,
        token: this.token,
        limit: limit
      };
      
      if (before) {
        params.before = before;
      }
      
      const response = await this.client.get(`/boards/${boardId}/cards`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch board cards');
    }
  }

  /**
   * Gets the list of attachments for a specific card.
   * 
   * @param cardId The ID of the card
   * @returns Promise resolving to an array of attachment data
   * @throws Error if the request fails
   */
  async getCardAttachments(cardId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/cards/${cardId}/attachments`, {
        params: {
          key: this.apiKey,
          token: this.token,
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch card attachments');
    }
  }

  /**
   * Handles errors from Axios requests
   * 
   * @param error The error from Axios
   * @param defaultMessage Default message to use if error details cannot be extracted
   * @returns A new Error with a descriptive message
   */
  private handleError(error: unknown, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      
      return new Error(`Trello API error (${status}): ${message}`);
    }
    return error instanceof Error ? error : new Error(defaultMessage);
  }
}