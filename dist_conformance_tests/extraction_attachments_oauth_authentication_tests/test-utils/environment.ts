export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export function getTestEnvironment(): TestEnvironment {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }

  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }

  if (!trelloOrganizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId
  };
}