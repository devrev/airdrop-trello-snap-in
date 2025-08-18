import { NormalizedItem, NormalizedAttachment } from '@devrev/ts-adaas';

/**
 * Normalization function for Trello users
 * Transforms raw Trello user data into a standardized format
 * 
 * @param user Raw Trello user data
 * @returns Normalized user data
 */
export function normalizeUser(user: any): NormalizedItem {
  // Extract created_date from the ID (first 8 characters represent Unix timestamp in hex)
  let createdDate = new Date();
  try {
    if (user.id && user.id.length >= 8) {
      const timestampHex = user.id.substring(0, 8);
      const timestampDec = parseInt(timestampHex, 16);
      createdDate = new Date(timestampDec * 1000); // Convert to milliseconds
    }
  } catch (error) {
    console.error('Error parsing created date from ID:', error);
  }

  // Use lastActive as modified_date if available, otherwise use created_date
  const modifiedDate = user.lastActive ? new Date(user.lastActive) : createdDate;

  return {
    id: user.id,
    created_date: createdDate.toISOString(),
    modified_date: modifiedDate.toISOString(),
    data: {
      full_name: user.fullName || '',
      username: user.username || ''
    }
  };
}

/**
 * Normalization function for Trello cards
 * Transforms raw Trello card data into a standardized format
 * 
 * @param card Raw Trello card data
 * @returns Normalized card data
 */
export function normalizeCard(card: any): NormalizedItem {
  // Extract created_date from the ID (first 8 characters represent Unix timestamp in hex)
  let createdDate = new Date();
  try {
    if (card.id && card.id.length >= 8) {
      const timestampHex = card.id.substring(0, 8);
      const timestampDec = parseInt(timestampHex, 16);
      createdDate = new Date(timestampDec * 1000); // Convert to milliseconds
    }
  } catch (error) {
    console.error('Error parsing created date from ID:', error);
  }

  // Use dateLastActivity as modified_date
  const modifiedDate = card.dateLastActivity ? new Date(card.dateLastActivity) : createdDate;

  // Convert description to rich text format if it's not empty
  const description = card.desc ? card.desc.split('\n').filter(Boolean) : [];

  return {
    id: card.id,
    created_date: createdDate.toISOString(),
    modified_date: modifiedDate.toISOString(),
    data: {
      name: card.name || '',
      url: card.url || '',
      description: description,
      id_members: card.idMembers || []
    }
  };
}

/**
 * Normalization function for Trello attachments
 * Transforms raw Trello attachment data into a standardized format
 * 
 * @param attachment Raw Trello attachment data
 * @returns Normalized attachment data
 */
export function normalizeAttachment(attachment: any): NormalizedAttachment {
  // Extract created_date from the ID (first 8 characters represent Unix timestamp in hex)
  let createdDate = new Date();
  try {
    if (attachment.id && attachment.id.length >= 8) {
      const timestampHex = attachment.id.substring(0, 8);
      const timestampDec = parseInt(timestampHex, 16);
      createdDate = new Date(timestampDec * 1000); // Convert to milliseconds
    }
  } catch (error) {
    console.error('Error parsing created date from ID:', error);
  }

  return {
    id: attachment.id,
    url: attachment.url,
    file_name: attachment.name,
    parent_id: attachment.idCard || '',
    author_id: attachment.idMember || undefined,
  };
}