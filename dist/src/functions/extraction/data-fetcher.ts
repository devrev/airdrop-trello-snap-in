import { 
  WorkerAdapter
} from '@devrev/ts-adaas';
import { ExtractorState } from './index';
import externalDomainMetadata from '../get_external_domain_metadata/external_domain_metadata.json';
import { 
  TrelloCard,
  normalizeUser, 
  normalizeCard,
  normalizeAttachment,
  createTrelloClient, 
  fetchOrganizationMembers, 
  fetchMemberBoards,
  fetchBoardCards
} from './trello-helpers';

/**
 * Initialize repositories for data extraction
 */
export function initializeDataRepositories(adapter: WorkerAdapter<ExtractorState>): void {
  const repos = [
    {
      itemType: 'users',
      normalize: normalizeUser,
    },
    {
      itemType: 'cards',
      normalize: normalizeCard,
    },
    {
      itemType: 'attachments',
      normalize: normalizeAttachment,
    },
  ];
  adapter.initializeRepos(repos);
}

/**
 * Initialize metadata repository
 */
export function initializeMetadataRepository(adapter: WorkerAdapter<ExtractorState>): void {
  const repos = [{ itemType: 'external_domain_metadata' }];
  adapter.initializeRepos(repos);
}

/**
 * Process metadata extraction
 */
export async function processMetadataExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  // Push the external domain metadata to the repository without normalization
  await adapter.getRepo('external_domain_metadata')?.push([externalDomainMetadata]);
}

/**
 * Process users data extraction
 */
export async function processUsersExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  if (adapter.state.users.completed) {
    return;
  }

  // Extract connection data
  const connectionData = adapter.event.payload.connection_data;
  const organizationId = connectionData?.org_id;

  // Create Trello client
  const trelloClient = createTrelloClient(connectionData);

  // Fetch organization members
  const members = await fetchOrganizationMembers(trelloClient, organizationId);

  // Push users to the repository
  await adapter.getRepo('users')?.push(members);

  // Update state to mark users as completed
  adapter.state.users.completed = true;
}

/**
 * Filter cards based on dateLastActivity for incremental sync
 */
function filterCardsForIncremental(cards: TrelloCard[], modifiedSince?: string): TrelloCard[] {
  if (!modifiedSince) {
    return cards;
  }

  const modifiedSinceDate = new Date(modifiedSince);
  return cards.filter((card: TrelloCard) => {
    if (!card.dateLastActivity) {
      return false;
    }
    const cardLastActivity = new Date(card.dateLastActivity);
    return cardLastActivity > modifiedSinceDate;
  });
}

/**
 * Process cards and attachments data extraction
 */
export async function processCardsExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  if (adapter.state.cards.completed) {
    return;
  }

  // Extract connection data
  const connectionData = adapter.event.payload.connection_data;
  const boardId = adapter.event.payload.event_context?.external_sync_unit_id;

  if (!boardId) {
    throw new Error('Missing board ID for cards extraction');
  }

  // Create Trello client
  const trelloClient = createTrelloClient(connectionData);

  let hasMoreCards = true;
  const limit = 100; // The Pagination Limit

  while (hasMoreCards) {
    // Fetch cards with pagination
    const options: { limit: number; before?: string } = { limit };
    if (adapter.state.cards.before) {
      options.before = adapter.state.cards.before;
    }

    const cards = await fetchBoardCards(trelloClient, boardId, options);

    if (cards.length === 0) {
      hasMoreCards = false;
      break;
    }

    // Update "before" parameter for next iteration
    if (cards.length > 0) {
      adapter.state.cards.before = cards[0].id;
    }

    // Filter cards for incremental sync if modifiedSince is set
    const filteredCards = filterCardsForIncremental(cards, adapter.state.cards.modifiedSince);

    // Flat map attachments from filtered cards and push them
    const attachments = filteredCards.flatMap((card: TrelloCard) => 
      (card.attachments || []).map(attachment => ({
        ...attachment,
        parentId: card.id
      }))
    );

    if (attachments.length > 0) {
      await adapter.getRepo('attachments')?.push(attachments);
    }

    // Push filtered cards to the repository
    if (filteredCards.length > 0) {
      await adapter.getRepo('cards')?.push(filteredCards);
    }

    // Check if we got fewer cards than the limit (last page)
    if (cards.length < limit) {
      hasMoreCards = false;
    }
  }

  // Mark cards and attachments as completed
  adapter.state.cards.completed = true;
  adapter.state.attachments.completed = true;
}

/**
 * Process external sync units extraction
 */
export async function processExternalSyncUnitsExtraction(adapter: WorkerAdapter<ExtractorState>) {
  // Extract connection data
  const connectionData = adapter.event.payload.connection_data;

  // Create Trello client
  const trelloClient = createTrelloClient(connectionData);

  // Fetch boards for the authenticated member
  const boards = await fetchMemberBoards(trelloClient);

  // Map the fetched boards to external sync units
  return boards.map((board: any) => ({
    id: board.id,
    name: board.name,
    description: board.desc || '',
    item_type: 'cards'
  }));
}