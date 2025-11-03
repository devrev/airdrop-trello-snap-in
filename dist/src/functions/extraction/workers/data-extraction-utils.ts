import { NormalizedItem, NormalizedAttachment } from "@devrev/ts-adaas";
import { TrelloOrganizationMember, TrelloCard } from '../../../core/trello-client';

export interface ExtractionState {
  users: { completed: boolean };
  cards: { completed: boolean; before?: string; modifiedSince?: string };
  attachments: { completed: boolean };
}

/**
 * Converts Trello ID to created date by extracting hex timestamp from first 8 characters
 */
export function convertTrelloIdToCreatedDate(trelloId: string): string {
  try {
    const hexTimestamp = trelloId.substring(0, 8);
    const timestamp = parseInt(hexTimestamp, 16);
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    // Fallback to current time if conversion fails
    return new Date().toISOString();
  }
}

/**
 * Checks if a card has been modified after a given timestamp
 * Used for incremental mode client-side filtering
 */
export function isCardModifiedAfter(card: TrelloCard, modifiedSince: string): boolean {
  if (!card.dateLastActivity || !modifiedSince) {
    return true; // Include card if no date information available
  }
  
  const cardDate = new Date(card.dateLastActivity);
  const sinceDate = new Date(modifiedSince);
  return cardDate > sinceDate;
}

/**
 * Normalizes Trello organization member to the expected format
 */
export function normalizeUser(rawUser: any): NormalizedItem {
  const user = rawUser as TrelloOrganizationMember;
  const userObj = rawUser as any;
  const createdDate = convertTrelloIdToCreatedDate(rawUser.id);
  const modifiedDate = rawUser.lastActive || createdDate;

  return {
    id: rawUser.id,
    created_date: createdDate,
    modified_date: modifiedDate,
    data: {
      full_name: user.fullName || null,
      username: user.username || null,
    },
  };
}

/**
 * Normalizes Trello card to the expected format
 */
export function normalizeCard(rawCard: any): NormalizedItem {
  const card = rawCard as TrelloCard & { createdBy?: string };
  const cardObj = rawCard as any;
  const createdDate = convertTrelloIdToCreatedDate(rawCard.id);
  const modifiedDate = rawCard.dateLastActivity || createdDate;

  // Convert description to rich text format
  const description = rawCard.desc ? 
    rawCard.desc.split('\n').filter((line: string) => line.trim() !== '') : 
    [];

  return {
    id: card.id,
    created_date: createdDate,
    modified_date: modifiedDate,
    data: {
      name: card.name || null,
      url: card.url || null,
      description: description,
      id_members: card.idMembers || [],
      created_by: card.createdBy || null,
    },
  };
}

/**
 * Normalizes Trello attachment to the expected format
 */
export function normalizeAttachment(rawAttachment: any, cardId: string): NormalizedAttachment {
  const attachment = rawAttachment as any;
  
  // Transform URL for Trello attachments
  let url = attachment.url;
  if (url && url.startsWith('https://trello.com')) {
    const fileName = attachment.fileName || attachment.name || 'file';
    url = `https://api.trello.com/1/cards/${cardId}/attachments/${attachment.id}/download/${fileName}`;
  }

  return {
    id: attachment.id,
    url: url || '',
    file_name: attachment.fileName || attachment.name || '',
    parent_id: cardId,
    author_id: attachment.idMember || undefined,
    grand_parent_id: undefined,
  };
}