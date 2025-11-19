import { TrelloClient } from '../../../core/trello-client';
import { handleApiResponse, emitRateLimitDelay } from './extraction-helpers';
import {
  fetchCardsMetadata,
  prepareCardsForNormalization,
  extractCommentsFromCards,
  extractAttachmentsFromCards,
} from './card-extraction-helpers';

/**
 * Extract users from Trello organization
 * Returns true if extraction should continue, false if rate limited or error occurred
 */
export async function extractUsers(
  adapter: any,
  trelloClient: TrelloClient,
  organizationId: string
): Promise<boolean> {
  if (adapter.state.users.completed) {
    return true;
  }

  // Fetch organization members
  const membersResponse = await trelloClient.getOrganizationMembers(organizationId);

  // Handle response validation and errors
  const isValid = await handleApiResponse(adapter, membersResponse, 'fetching organization members');
  if (!isValid) {
    return false;
  }

  // Fetch detailed information for each member asynchronously
  let rateLimited = false;
  let delay = 0;

  const userDetailsPromises = membersResponse.data.map(async (member: any) => {
    if (rateLimited) return null;

    const detailsResponse = await trelloClient.getMemberDetails(member.id);

    if (detailsResponse.status_code === 429) {
      rateLimited = true;
      delay = detailsResponse.api_delay;
      return null;
    }

    if (detailsResponse.status_code !== 200 || !detailsResponse.data) {
      return null;
    }

    return {
      id: member.id,
      full_name: member.fullName || '',
      username: member.username || '',
      email: detailsResponse.data.email || '',
    };
  });

  const userDetails = await Promise.all(userDetailsPromises);

  // Check if rate limited during member details fetching
  if (rateLimited) {
    await emitRateLimitDelay(adapter, delay);
    return false;
  }

  // Filter out null values (failed requests)
  const users = userDetails.filter((user): user is any => user !== null);

  // Push users to repository
  await adapter.getRepo('users')?.push(users);

  // Mark users extraction as completed
  adapter.state.users.completed = true;
  return true;
}

/**
 * Extract labels from Trello board
 * Returns true if extraction should continue, false if rate limited or error occurred
 */
export async function extractLabels(
  adapter: any,
  trelloClient: TrelloClient,
  boardId: string
): Promise<boolean> {
  if (adapter.state.labels.completed) {
    return true;
  }

  // Fetch labels for the board
  const labelsResponse = await trelloClient.getLabels(boardId);

  // Handle response validation and errors
  const isValid = await handleApiResponse(adapter, labelsResponse, 'fetching labels');
  if (!isValid) {
    return false;
  }

  // Map labels to the expected format
  const labels = labelsResponse.data.map((label: any) => ({
    id: label.id,
    name: label.name || '',
    color: label.color || '',
  }));

  // Push labels to repository
  await adapter.getRepo('labels')?.push(labels);

  // Mark labels extraction as completed
  adapter.state.labels.completed = true;
  return true;
}

/**
 * Filter cards by modified date for incremental sync
 */
function filterCardsByModifiedDate(cards: any[], modifiedSince?: string): any[] {
  if (!modifiedSince) {
    return cards;
  }

  const modifiedSinceDate = new Date(modifiedSince);
  
  return cards.filter((card: any) => {
    if (!card.dateLastActivity) {
      return false;
    }
    
    const cardLastActivity = new Date(card.dateLastActivity);
    return cardLastActivity > modifiedSinceDate;
  });
}

/**
 * Extract cards from Trello board
 * Returns true if extraction should continue, false if rate limited or error occurred
 */
export async function extractCards(
  adapter: any,
  trelloClient: TrelloClient,
  boardId: string
): Promise<boolean> {
  if (adapter.state.cards.completed) {
    return true;
  }

  // Fetch lists for stage mapping
  const listsResponse = await trelloClient.getLists(boardId);

  // Handle response validation and errors
  const isListsValid = await handleApiResponse(adapter, listsResponse, 'fetching lists');
  if (!isListsValid) {
    return false;
  }

  // Build list ID to name mapping
  const listIdToNameMapping: Record<string, string> = {};
  if (listsResponse.data) {
    for (const list of listsResponse.data) {
      listIdToNameMapping[list.id] = (list.name || '').toLowerCase();
    }
  }

  // Get modifiedSince for incremental mode
  const modifiedSince = adapter.state.cards.modifiedSince;

  // Pagination loop
  while (!adapter.state.cards.completed) {
    // Fetch cards with pagination
    const cardsResponse = await trelloClient.getCards(
      boardId,
      10,
      adapter.state.cards.before
    );

    // Handle response validation and errors
    const isCardsValid = await handleApiResponse(adapter, cardsResponse, 'fetching cards');
    if (!isCardsValid) {
      return false;
    }

    const cards: any[] = cardsResponse.data || [];

    // Sort cards by creation date (ascending)
    const sortedCards: any[] = cards.sort((a: any, b: any) => {
      const dateA = a.id.substring(0, 8);
      const dateB = b.id.substring(0, 8);
      return dateA.localeCompare(dateB);
    });

    // Check if we should continue pagination
    if (sortedCards.length < 10) {
      adapter.state.cards.completed = true;
      adapter.state.cards.before = undefined;
    } else {
      adapter.state.cards.before = sortedCards[0].id;
    }

    // Filter cards by modified date for incremental sync
    const filteredCards = filterCardsByModifiedDate(sortedCards, modifiedSince);

    // Skip this batch if no cards match the filter
    if (filteredCards.length === 0) {
      continue;
    }

    // Fetch metadata for filtered cards only
    const { cards: cardsWithMetadata, rateLimited, delay } = await fetchCardsMetadata(
      trelloClient,
      filteredCards
    );

    if (rateLimited) {
      await emitRateLimitDelay(adapter, delay);
      return false;
    }

    // Prepare cards for normalization
    const normalizedCards = prepareCardsForNormalization(cardsWithMetadata, listIdToNameMapping);

    if (normalizedCards.length > 0) {
      await adapter.getRepo('cards')?.push(normalizedCards);
    }

    // Push comments for all cards in this batch
    const allComments = extractCommentsFromCards(cardsWithMetadata);
    if (allComments.length > 0) {
      await adapter.getRepo('comments')?.push(allComments);
    }

    // Push attachments for all cards in this batch
    const allAttachments = extractAttachmentsFromCards(cardsWithMetadata);
    if (allAttachments.length > 0) {
      await adapter.getRepo('attachments')?.push(allAttachments);
    }
  }

  // Mark comments and attachments as completed when cards are completed
  adapter.state.comments.completed = true;
  adapter.state.attachments.completed = true;
  return true;
}