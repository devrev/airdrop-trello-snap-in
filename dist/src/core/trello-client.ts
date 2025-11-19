import axios, { AxiosInstance } from 'axios';
import * as apiMethods from './trello-api-methods';

export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export interface TrelloApiResponse<T = any> {
  status_code: number;
  api_delay: number;
  message: string;
  data?: T;
}

export class TrelloClient {
  private client: AxiosInstance;
  private credentials: TrelloCredentials;

  constructor(credentials: TrelloCredentials) {
    this.credentials = credentials;
    this.client = axios.create({
      baseURL: 'https://api.trello.com/1',
      timeout: 30000,
    });
  }

  /**
   * Get all boards for an organization
   */
  async getBoards(organizationId: string): Promise<TrelloApiResponse> {
    return apiMethods.getBoards(this.client, this.credentials, organizationId);
  }

  /**
   * Get all members of an organization with specific fields
   */
  async getOrganizationMembers(organizationId: string): Promise<TrelloApiResponse> {
    return apiMethods.getOrganizationMembers(this.client, this.credentials, organizationId);
  }

  /**
   * Get detailed information about a member
   */
  async getMemberDetails(memberId: string): Promise<TrelloApiResponse> {
    return apiMethods.getMemberDetails(this.client, this.credentials, memberId);
  }

  /**
   * Get all labels on a board
   */
  async getLabels(boardId: string): Promise<TrelloApiResponse> {
    return apiMethods.getLabels(this.client, this.credentials, boardId);
  }

  /**
   * Get all comments on a card
   */
  async getComments(cardId: string): Promise<TrelloApiResponse> {
    return apiMethods.getComments(this.client, this.credentials, cardId);
  }

  /**
   * Get all cards on a board with pagination support
   */
  async getCards(boardId: string, limit?: number, before?: string): Promise<TrelloApiResponse> {
    return apiMethods.getCards(this.client, this.credentials, boardId, limit, before);
  }

  /**
   * Get all lists on a board
   */
  async getLists(boardId: string): Promise<TrelloApiResponse> {
    return apiMethods.getLists(this.client, this.credentials, boardId);
  }

  /**
   * Get the createCard action for a card
   */
  async getCardCreateAction(cardId: string): Promise<TrelloApiResponse> {
    return apiMethods.getCardCreateAction(this.client, this.credentials, cardId);
  }

  /**
   * Download an attachment file with OAuth 1.0a authentication
   */
  async downloadAttachment(
    cardId: string,
    attachmentId: string,
    fileName: string
  ): Promise<TrelloApiResponse> {
    return apiMethods.downloadAttachment(this.client, this.credentials, cardId, attachmentId, fileName);
  }
}

/**
 * Parse Trello credentials from connection data
 */
export function parseConnectionData(connectionDataKey: string): TrelloCredentials {
  const params = new URLSearchParams(connectionDataKey);
  const apiKey = params.get('key');
  const token = params.get('token');

  if (!apiKey || !token) {
    throw new Error('Invalid connection data: missing API key or token');
  }

  return {
    apiKey,
    token,
  };
}