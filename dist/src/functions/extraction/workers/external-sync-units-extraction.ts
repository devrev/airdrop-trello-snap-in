import { processTask, ExtractorEventType, ExternalSyncUnit } from '@devrev/ts-adaas';
import { TrelloClient, TrelloBoard } from '../../../core/trello-client';

/**
 * Normalizes a Trello board to an external sync unit
 */
function normalizeBoardToExternalSyncUnit(board: TrelloBoard): ExternalSyncUnit {
  return {
    id: board.id,
    name: board.name,
    description: board.desc || '',
    item_type: 'cards',
  };
}

processTask({
  task: async ({ adapter }) => {
    try {
      // Get connection data from the event
      const connectionData = adapter.event.payload.connection_data;
      if (!connectionData || !connectionData.key) {
        throw new Error('Missing connection data or API key');
      }

      // Create Trello client
      const trelloClient = TrelloClient.fromConnectionData(connectionData.key);

      // Fetch boards from Trello API
      const response = await trelloClient.getMemberBoards();

      if (response.status_code !== 200 || !response.data) {
        throw new Error(`Failed to fetch boards: ${response.message}`);
      }

      // Map boards to external sync units
      const externalSyncUnits: ExternalSyncUnit[] = response.data.map(normalizeBoardToExternalSyncUnit);

      // Emit success event with external sync units
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
    } catch (error) {
      console.error('External sync units extraction error:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred during external sync units extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    try {
      console.error('External sync units extraction timeout');
      
      // Emit error event on timeout
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units. Lambda timeout.',
        },
      });
    } catch (error) {
      console.error('Error handling timeout in external sync units extraction:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  },
});
