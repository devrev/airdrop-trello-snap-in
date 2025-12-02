/**
 * Low-level conversion utilities for transforming Trello data
 */

/**
 * Map list name to DevRev stage according to StageMappingRule
 */
export function mapListNameToStage(listName: string): string {
  const lowerName = listName.toLowerCase();
  
  if (lowerName.includes('backlog')) {
    return 'backlog';
  } else if (lowerName.includes('doing')) {
    return 'in_development';
  } else if (lowerName.includes('review')) {
    return 'in_review';
  } else if (lowerName.includes('done')) {
    return 'completed';
  } else if (lowerName.includes('archive')) {
    return 'completed';
  }
  
  // Default to backlog if no match
  return 'backlog';
}

/**
 * Convert Trello ID's first 8 characters (hex timestamp) to ISO 8601 datetime
 */
export function convertTrelloIdToDate(id: string): string {
  const hexTimestamp = id.substring(0, 8);
  const timestamp = parseInt(hexTimestamp, 16);
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Convert Trello color to hex code according to ColorToHexCodeConversionRule
 */
export function convertColorToHex(color: string): string {
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
 * Convert string to rich text format (array of strings)
 */
export function convertToRichText(text: string): string[] {
  if (!text) return [];
  return text.split('\n').filter(line => line.trim() !== '');
}

/**
 * Construct URL for attachment according to URLConstructionRule
 */
export function constructAttachmentUrl(attachment: any, cardId: string): string {
  const url = attachment.url || '';
  
  // Check if URL starts with "https://trello.com"
  if (url.startsWith('https://trello.com')) {
    // Construct download URL
    const fileName = attachment.fileName || attachment.name || '';
    return `https://api.trello.com/1/cards/${cardId}/attachments/${attachment.id}/download/${fileName}`;
  }
  
  // Return original URL for external attachments
  return url;
}