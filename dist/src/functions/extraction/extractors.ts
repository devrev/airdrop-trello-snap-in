import { ExtractorEventType, ExternalSyncUnit, EventType, 
         ExternalSystemAttachmentStreamingParams, ExternalSystemAttachmentStreamingResponse } from '@devrev/ts-adaas';
import { TrelloClient } from '../../core/trello-client';
import { ExtractorState } from './types';
import { extractUsers, extractCards } from './trello-api-helpers';
import externalDomainMetadata from '../../external-domain-metadata.json';

export async function handleExternalSyncUnitsExtraction(adapter: any) {
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

  // Retrieve The Fetched Boards
  const response = await trelloClient.getBoardsForMember('me');

  if (response.status_code !== 200) {
    throw new Error(`Failed to fetch boards: ${response.message}`);
  }

  if (!response.data) {
    throw new Error('No boards data received from Trello API');
  }

  // Map The Fetched Boards to External Sync Units
  const externalSyncUnits: ExternalSyncUnit[] = response.data.map((board: any) => ({
    id: board.id,
    name: board.name,
    description: board.desc || '',
    item_type: 'cards'
  }));

  // Emit the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
  await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
    external_sync_units: externalSyncUnits,
  });
}

export async function handleMetadataExtraction(adapter: any) {
  // Initialize repository for external domain metadata
  const repos = [{ itemType: 'external_domain_metadata' }];
  adapter.initializeRepos(repos);

  // Push the external domain metadata (without normalization)
  await adapter.getRepo('external_domain_metadata')?.push([externalDomainMetadata]);

  // Emit the EXTRACTION_METADATA_DONE event
  await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
}

export async function handleDataExtraction(adapter: any, normalizeUser: any, normalizeCard: any, normalizeAttachment: any) {
  // Initialize repositories
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

  // Check if users extraction is needed
  if (!adapter.state.users.completed) {
    await extractUsers(adapter);
    adapter.state.users.completed = true;
  }

  // Check if cards extraction is needed
  if (!adapter.state.cards.completed) {
    await extractCards(adapter);
    adapter.state.attachments.completed = true;
    adapter.state.cards.completed = true;
    adapter.state.cards.before = '';
  }

  // Emit the EXTRACTION_DATA_DONE event
  await adapter.emit(ExtractorEventType.ExtractionDataDone);
}

export async function handleAttachmentsExtraction(adapter: any) {
  // Extract connection data and parse credentials
  const connectionData = adapter.event.payload.connection_data;
  if (!connectionData || !connectionData.key) {
    throw new Error('Missing connection data');
  }

  const credentials = TrelloClient.parseCredentials(connectionData.key);

  // Create attachment stream handler
  const getAttachmentStream = async ({
    item,
    event,
  }: ExternalSystemAttachmentStreamingParams): Promise<ExternalSystemAttachmentStreamingResponse> => {
    const { id, url } = item;

    try {
      const trelloClient = new TrelloClient({
        apiKey: credentials.apiKey,
        token: credentials.token,
      });

      return await trelloClient.streamAttachment(url);
    } catch (error) {
      console.error(`Error while fetching attachment ${id} from URL.`, error);
      console.error('Failed attachment metadata', item);
      return { error: { message: `Error while fetching attachment ${id} from URL.` } };
    }
  };

  return getAttachmentStream;
}