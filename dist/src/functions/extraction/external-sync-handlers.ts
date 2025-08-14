import { ExtractorEventType, ExternalSyncUnit } from '@devrev/ts-adaas';
import { TrelloClient } from '../../core/trello_client';
import { FunctionInput } from '../../core/types';

/**
 * Handles external sync units extraction by fetching boards from Trello
 * and mapping them to external sync units.
 */
export async function handleExternalSyncUnitsExtraction(adapter: any): Promise<void> {
  console.log('Processing external sync units extraction task');

  try {
    // Convert AirdropEvent to FunctionInput for TrelloClient
    const functionInput: FunctionInput = {
      payload: adapter.event.payload,
      context: {
        dev_oid: '',
        source_id: '',
        snap_in_id: adapter.event.context.snap_in_id || '',
        snap_in_version_id: adapter.event.context.snap_in_version_id || '',
        service_account_id: '',
        secrets: adapter.event.context.secrets || {},
      },
      execution_metadata: { ...adapter.event.execution_metadata, request_id: '', function_name: '', event_type: '' },
      input_data: adapter.event.input_data || { global_values: {}, event_sources: {} },
    };
    // Initialize the Trello client
    const trelloClient = new TrelloClient(functionInput);
    
    // Fetch the boards from Trello
    const boards = await trelloClient.getBoards();
    console.log(`Successfully fetched ${boards.length} boards`);

    // For each board, fetch the card count
    const externalSyncUnits: ExternalSyncUnit[] = [];
    
    for (const board of boards) {
      try {
        // Initialize card count
        let cardCount = 0;
        let hasMoreCards = true;
        let beforeParam: string | undefined = undefined;
        
        // Fetch cards with pagination to get the total count
        while (hasMoreCards) {
          // Explicitly type the cards array
          const cards: Array<{id: string}> = await trelloClient.getBoardCards(
            board.id, 100, beforeParam);
          cardCount += cards.length;
          
          // If we got fewer cards than the limit, we've reached the end
          if (!cards || cards.length < 100) {
            hasMoreCards = false;
          } else if (cards.length > 0) {
            // Use the ID of the first card as the 'before' parameter for the next request
            beforeParam = cards[0].id;
          } else {
            hasMoreCards = false;
          }
        }
        
        // Add the board to external sync units with the card count
        externalSyncUnits.push({
          id: board.id,
          name: board.name,
          description: board.desc || '',
          item_type: 'tasks',
          item_count: cardCount,
        });
    
      } catch (error) {
        console.error(`Error fetching card count for board ${board.id}: ${error}`);
        // Add the board with item_count as -1 to indicate error
        externalSyncUnits.push({
          id: board.id,
          name: board.name,
          description: board.desc || '',
          item_type: 'tasks',
          item_count: -1,
        });
      }
    }
    
    console.log(`Mapped ${externalSyncUnits.length} boards to external sync units`);
    
    // Emit the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event with the external sync units
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
      external_sync_units: externalSyncUnits,
    });
    
    console.log('External sync units extraction task completed successfully');
  } catch (error) {
    console.error('Error during external sync units extraction:', error);
    
    // Emit error event
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error during external sync units extraction',
      },
    });
  }
}