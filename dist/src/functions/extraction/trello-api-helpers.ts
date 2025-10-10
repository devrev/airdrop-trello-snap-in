import { ExtractorEventType } from '@devrev/ts-adaas';
import { TrelloClient } from '../../core/trello-client';

export async function extractUsers(adapter: any) {
  // Extract connection data and parse credentials
  const connectionData = adapter.event.payload.connection_data;
  if (!connectionData || !connectionData.key) {
    throw new Error('Missing connection data');
  }

  const credentials = TrelloClient.parseCredentials(connectionData.key);

  // Initialize Trello client
  const trelloClient = new TrelloClient({
    apiKey: credentials.apiKey,
    token: credentials.token,
  });

  // Get organization ID from connection data
  const organizationId = connectionData.org_id;
  if (!organizationId) {
    throw new Error('Missing organization ID');
  }

  // Fetch The Fetched Users
  const response = await trelloClient.getOrganizationMembers(organizationId);

  if (response.status_code === 429) {
    // Handle rate limiting
    await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
      delay: response.api_delay,
    });
    return;
  }

  if (response.status_code !== 200) {
    throw new Error(`Failed to fetch organization members: ${response.message}`);
  }

  if (!response.data) {
    throw new Error('No users data received from Trello API');
  }

  // Push The Fetched Users to the repository
  await adapter.getRepo('users')?.push(response.data);
}

export async function extractCards(adapter: any) {
  // Extract connection data and parse credentials
  const connectionData = adapter.event.payload.connection_data;
  if (!connectionData || !connectionData.key) {
    throw new Error('Missing connection data');
  }

  const credentials = TrelloClient.parseCredentials(connectionData.key);

  // Initialize Trello client
  const trelloClient = new TrelloClient({
    apiKey: credentials.apiKey,
    token: credentials.token,
  });

  // Get board ID from event context
  const boardId = adapter.event.payload.event_context?.external_sync_unit_id;
  if (!boardId) {
    throw new Error('Missing board ID');
  }

  const ThePaginationLimit = 100;
  const modifiedSince = adapter.state.cards.modifiedSince;

  // The Cards Iteration - pagination loop
  while (true) {
    // Fetch The Fetched Cards
    const response = await trelloClient.getBoardCards(
      boardId, 
      ThePaginationLimit, 
      adapter.state.cards.before || undefined
    );

    if (response.status_code === 429) {
      // Handle rate limiting
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: response.api_delay,
      });
      return;
    }

    if (response.status_code !== 200) {
      throw new Error(`Failed to fetch board cards: ${response.message}`);
    }

    if (!response.data) {
      throw new Error('No cards data received from Trello API');
    }

    const cardsResponse = response.data;

    // Filter cards for incremental mode if modifiedSince is set
    let filteredCards = cardsResponse;
    if (modifiedSince) {
      const modifiedSinceDate = new Date(modifiedSince);
      filteredCards = cardsResponse.filter((card: any) => {
        const cardLastActivity = new Date(card.dateLastActivity);
        return cardLastActivity > modifiedSinceDate;
      });
    }

    // Push The Filtered Cards to the repository
    await adapter.getRepo('cards')?.push(filteredCards);

    // Extract The Fetched Attachments from The Fetched Cards
    const attachments: any[] = [];
    filteredCards.forEach((card: any) => {
      if (card.attachments && Array.isArray(card.attachments)) {
        card.attachments.forEach((attachment: any) => {
          attachments.push({ ...attachment, parent_id: card.id });
        });
      }
    });

    // Push The Fetched Attachments to the repository
    await adapter.getRepo('attachments')?.push(attachments);

    // Check if we got fewer cards than the limit (end of pagination)
    if (cardsResponse.length < ThePaginationLimit) {
      break;
    }

    // Update the before parameter for next iteration
    adapter.state.cards.before = cardsResponse[0].id;
  }
}