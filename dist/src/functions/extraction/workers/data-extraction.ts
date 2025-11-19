import { ExtractorEventType, processTask, SyncMode } from "@devrev/ts-adaas";
import { ExtractorState, initialState } from "../index";
import { TrelloClient, parseConnectionData } from "../../../core/trello-client";
import { normalizeUser, normalizeLabel, normalizeCard, normalizeComment, normalizeAttachment } from "./data-extraction-utils";
import { extractUsers, extractLabels, extractCards } from "./data-extraction-phases";

processTask<ExtractorState>({
  task: async ({ adapter }) => {
    // Initialize repositories
    const repos = [
      {
        itemType: 'users',
        normalize: normalizeUser,
      },
      {
        itemType: 'labels',
        normalize: normalizeLabel,
      },
      {
        itemType: 'cards',
        normalize: normalizeCard,
      },
      {
        itemType: 'comments',
        normalize: normalizeComment,
      },
      {
        itemType: 'attachments',
        normalize: normalizeAttachment,
      },
    ];
    adapter.initializeRepos(repos);

    // Parse connection data
    const connectionDataKey = adapter.event.payload.connection_data.key;
    const organizationId = adapter.event.payload.connection_data.org_id;
    const boardId = adapter.event.payload.event_context.external_sync_unit_id;

    if (!connectionDataKey) {
      const error = new Error('Missing connection data key');
      console.error(error.message);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error.message },
      });
      return;
    }

    if (!organizationId) {
      const error = new Error('Missing organization ID');
      console.error(error.message);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error.message },
      });
      return;
    }

    if (!boardId) {
      const error = new Error('Missing board ID');
      console.error(error.message);
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: { message: error.message },
      });
      return;
    }

    // Handle incremental mode
    if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
      // Reset state for artifacts that support incremental mode
      adapter.state.cards = { ...initialState.cards };
      adapter.state.comments = { ...initialState.comments };
      adapter.state.attachments = { ...initialState.attachments };
      
      // Set modifiedSince from lastSuccessfulSyncStarted
      adapter.state.cards.modifiedSince = adapter.state.lastSuccessfulSyncStarted;
    }

    const credentials = parseConnectionData(connectionDataKey);
    const trelloClient = new TrelloClient(credentials);

    // Extract users
    const usersSuccess = await extractUsers(adapter, trelloClient, organizationId);
    if (!usersSuccess) {
      return;
    }

    // Extract labels
    const labelsSuccess = await extractLabels(adapter, trelloClient, boardId);
    if (!labelsSuccess) {
      return;
    }

    // Extract cards (includes comments and attachments)
    const cardsSuccess = await extractCards(adapter, trelloClient, boardId);
    if (!cardsSuccess) {
      return;
    }

    // Emit completion event only when all extractions are completed
    if (adapter.state.users.completed && adapter.state.labels.completed && adapter.state.cards.completed && adapter.state.comments.completed && adapter.state.attachments.completed) {
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionDataProgress);
  },
});