/**
 * Utility functions for handling environment variables
 */

/**
 * Gets required environment variables and throws an error if any are missing
 */
export function getRequiredEnvVars(): {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrgId: string;
} {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }

  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }

  if (!trelloOrgId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrgId
  };
}