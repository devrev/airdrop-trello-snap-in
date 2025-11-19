/**
 * Utility for reading and validating environment variables
 */

export interface TrelloCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

/**
 * Read Trello credentials from environment variables
 * @throws Error if any required environment variable is missing
 */
export function getTrelloCredentials(): TrelloCredentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey) {
    throw new Error('Missing required environment variable: TRELLO_API_KEY');
  }

  if (!token) {
    throw new Error('Missing required environment variable: TRELLO_TOKEN');
  }

  if (!organizationId) {
    throw new Error('Missing required environment variable: TRELLO_ORGANIZATION_ID');
  }

  return {
    apiKey,
    token,
    organizationId,
  };
}