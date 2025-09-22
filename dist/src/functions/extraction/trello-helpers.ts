import { NormalizedItem, NormalizedAttachment } from '@devrev/ts-adaas';
import { TrelloClient, parseApiCredentials } from '../../core/trello-client';

// Define interface for Trello board
export interface TrelloBoard {
  id: string;
  name: string;
  desc?: string;
  closed: boolean;
  url: string;
}

// Define interface for Trello user
export interface TrelloUser {
  id: string;
  fullName?: string;
  username: string;
}

// Define interface for Trello card
export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  url: string;
  idMembers: string[];
  dateLastActivity?: string;
  attachments?: TrelloAttachment[];
}

// Define interface for Trello attachment
export interface TrelloAttachment {
  id: string;
  name: string;
  url: string;
  fileName?: string;
  date: string;
  idMember?: string;
}

// Define interface for card with parent ID for attachments
export interface TrelloCardWithParentId extends TrelloCard {
  idCard?: string; // For attachments to reference parent card
}

/**
 * Normalization function for users
 * @param record The raw user record from Trello
 * @returns Normalized user item
 */
export function normalizeUser(record: object): NormalizedItem {
  // Type check and cast the record to TrelloUser
  const user = record as TrelloUser;
  if (!user.id || !user.username) {
    throw new Error('Invalid user record: missing required fields id or username');
  }
  
  // Convert first 8 characters of ID from hex to decimal, then to ISO 8601 date
  const hexTimestamp = user.id.substring(0, 8);
  const timestamp = parseInt(hexTimestamp, 16);
  const createdDate = new Date(timestamp * 1000).toISOString();

  return {
    id: user.id,
    created_date: createdDate,
    modified_date: createdDate, // Trello doesn't provide user modification date
    data: {
      full_name: user.fullName || null,
      username: user.username
    }
  };
}

/**
 * Normalization function for cards
 * @param record The raw card record from Trello
 * @returns Normalized card item
 */
export function normalizeCard(record: object): NormalizedItem {
  // Type check and cast the record to TrelloCard
  const card = record as TrelloCard;
  if (!card.id || !card.name) {
    throw new Error('Invalid card record: missing required fields id or name');
  }
  
  // Convert first 8 characters of ID from hex to decimal, then to ISO 8601 date
  const hexTimestamp = card.id.substring(0, 8);
  const timestamp = parseInt(hexTimestamp, 16);
  const createdDate = new Date(timestamp * 1000).toISOString();

  // Convert description to rich text format (split by newlines, filter empty lines)
  const description = card.desc ? 
    card.desc.split('\n').filter(line => line.trim() !== '') : 
    [];

  return {
    id: card.id,
    created_date: createdDate,
    modified_date: createdDate, // Trello doesn't provide card modification date in basic API
    data: {
      name: card.name,
      url: card.url,
      description: description,
      id_members: card.idMembers || []
    }
  };
}

/**
 * Normalization function for attachments
 * @param record The raw attachment record from Trello
 * @returns Normalized attachment item
 */
export function normalizeAttachment(record: object): NormalizedAttachment {
  // Type check and cast the record to TrelloAttachment with parent info
  const attachment = record as TrelloAttachment & { parentId: string };
  if (!attachment.id || !attachment.name || !attachment.parentId) {
    throw new Error('Invalid attachment record: missing required fields id, name, or parentId');
  }

  // Normalize URL based on Trello URL rules
  let normalizedUrl = attachment.url;
  if (attachment.url.startsWith('https://trello.com')) {
    const baseUrl = process.env.TRELLO_BASE_URL || 'https://api.trello.com/1';
    const fileName = attachment.fileName || attachment.name;
    normalizedUrl = `${baseUrl}/cards/${attachment.parentId}/attachments/${attachment.id}/download/${fileName}`;
  }

  return {
    id: attachment.id,
    url: normalizedUrl,
    file_name: attachment.fileName || attachment.name,
    parent_id: attachment.parentId,
    author_id: attachment.idMember || undefined
  };
}

/**
 * Creates and configures a Trello client
 * @param connectionData Connection data containing API credentials
 * @returns Configured TrelloClient instance
 */
export function createTrelloClient(connectionData: any): TrelloClient {
  // Get the base URL from environment variable
  const baseUrl = process.env.TRELLO_BASE_URL;
  if (!baseUrl) {
    throw new Error('TRELLO_BASE_URL environment variable not set');
  }

  if (!connectionData || !connectionData.key) {
    throw new Error('Missing connection data or API key');
  }

  // Parse API credentials
  const apiCredentials = parseApiCredentials(connectionData.key);

  // Initialize and return Trello client
  return new TrelloClient({
    baseUrl,
    apiKey: apiCredentials.apiKey,
    token: apiCredentials.token,
  });
}

/**
 * Fetches organization members from Trello
 * @param trelloClient Configured Trello client
 * @param organizationId Organization ID to fetch members for
 * @returns Promise resolving to organization members data
 */
export async function fetchOrganizationMembers(trelloClient: TrelloClient, organizationId: string) {
  if (!organizationId) {
    throw new Error('Missing organization ID');
  }

  const response = await trelloClient.getOrganizationMembers(organizationId);

  if (response.status_code !== 200 || !response.data) {
    throw new Error(`Failed to fetch organization members: ${response.message}`);
  }

  return response.data;
}

/**
 * Fetches cards for a board with pagination
 * @param trelloClient Configured Trello client
 * @param boardId Board ID to fetch cards for
 * @param options Pagination options
 * @returns Promise resolving to cards data
 */
export async function fetchBoardCards(trelloClient: TrelloClient, boardId: string, options: { limit: number; before?: string }) {
  if (!boardId) {
    throw new Error('Missing board ID');
  }

  const response = await trelloClient.getBoardCards(boardId, options);

  if (response.status_code !== 200 || !response.data) {
    throw new Error(`Failed to fetch board cards: ${response.message}`);
  }

  return response.data;
}

/**
 * Fetches boards for the authenticated member
 * @param trelloClient Configured Trello client
 * @returns Promise resolving to boards data
 */
export async function fetchMemberBoards(trelloClient: TrelloClient) {
  const response = await trelloClient.getMemberBoards('me');

  if (response.status_code !== 200 || !response.data) {
    throw new Error(`Failed to fetch boards: ${response.message}`);
  }

  return response.data;
}