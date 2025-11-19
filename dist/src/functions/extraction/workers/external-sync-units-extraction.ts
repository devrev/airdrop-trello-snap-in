import { ExtractorEventType, processTask, ExternalSyncUnit } from '@devrev/ts-adaas';
import { TrelloClient, parseConnectionData } from '../../../core/trello-client';

processTask({
  task: async ({ adapter }) => {
    try {
      // Parse connection data
      const connectionDataKey = adapter.event.payload.connection_data?.key;
      const organizationId = adapter.event.payload.connection_data?.org_id;

      if (!connectionDataKey) {
        const error = new Error('Missing connection data key');
        console.error(error.message);
        throw error;
      }

      if (!organizationId) {
        const error = new Error('Missing organization ID');
        console.error(error.message);
        throw error;
      }

      // Parse credentials
      const credentials = parseConnectionData(connectionDataKey);

      // Initialize Trello client
      const trelloClient = new TrelloClient(credentials);

      // Fetch boards
      const response = await trelloClient.getBoards(organizationId);

      // Handle rate limiting
      if (response.status_code === 429) {
        await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
          error: {
            message: 'Rate limit exceeded while fetching boards',
          },
        });
        return;
      }

      // Handle API errors
      if (response.status_code !== 200 || !response.data) {
        await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
          error: {
            message: response.message || 'Failed to fetch boards',
          },
        });
        return;
      }

      // Map boards to ExternalSyncUnit format
      const externalSyncUnits: ExternalSyncUnit[] = response.data.map((board: any) => ({
        id: board.id,
        name: board.name,
        description: board.desc || '',
        item_type: 'cards',
      }));

      // Emit success event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error in external sync units extraction:', errorMessage);
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: `Failed to extract external sync units: ${errorMessage}`,
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
  },
});
