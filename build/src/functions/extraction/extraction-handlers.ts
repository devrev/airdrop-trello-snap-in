import { ExtractorEventType, EventType, NormalizedItem, SyncMode } from '@devrev/ts-adaas';
import { TrelloClient } from '../../core/trello_client';
import { FunctionInput } from '../../core/types';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeUser, normalizeCard } from './normalizers';
import { handleAttachmentsExtraction, getAttachmentStream } from './attachment-handlers';
import { handleExternalSyncUnitsExtraction } from './external-sync-handlers';

// Define the extraction state type
export type ExtractorState = {
  users: {
    completed: boolean;
  };
  cards: {
    completed: boolean;
    before?: string;
    modifiedSince?: string;
  };
  attachments: {
    completed: boolean;
    lastProcessed?: number;
  };
};

/**
 * Handles metadata extraction by reading the external domain metadata
 * and pushing it to the repository.
 */
export async function handleMetadataExtraction(adapter: any): Promise<void> {
  console.log('Processing metadata extraction task');
  
  try {
    // Read the external domain metadata from the JSON file
    const metadataFilePath = path.resolve(__dirname, '../../core/external_domain_metadata.json');
    const metadataContent = fs.readFileSync(metadataFilePath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    // Initialize the repository for external domain metadata
    adapter.initializeRepos([{ itemType: 'external_domain_metadata' }]);
    
    // Push the metadata to the repository without normalization
    await adapter.getRepo('external_domain_metadata')?.push([metadata]);
    
    // Emit the EXTRACTION_METADATA_DONE event
    await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
    
    console.log('Metadata extraction task completed successfully');
  } catch (error) {
    console.error('Error during metadata extraction:', error);
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: { message: error instanceof Error ? error.message : 'Unknown error during metadata extraction' },
    });
  }
}

/**
 * Handles data extraction by fetching users and cards from Trello
 * and pushing them to the repositories.
 */
export async function handleDataExtraction(adapter: any): Promise<void> {
  console.log('Processing data extraction task');
  
  try {
    // Initialize state if it doesn't exist
    if (!adapter.state.users) {
      adapter.state = {
        ...adapter.state,
        users: { completed: false }
      };
    }
    
    if (!adapter.state.cards) {
      adapter.state = {
        ...adapter.state,
        cards: { completed: false }
      };
    }
    
    if (!adapter.state.attachments) {
      adapter.state = {
        ...adapter.state,
        attachments: { completed: false }
      };
    }

    // Check if we're in incremental mode
    const isIncrementalMode = adapter.event.payload.event_type === EventType.ExtractionDataStart && 
                              adapter.event.payload.event_context.mode === 'INCREMENTAL';

    // Get the timestamp for incremental sync
    let modifiedSince: string | undefined = undefined;
    if (isIncrementalMode) {
      // First check event data, then fall back to adapter state
      modifiedSince = adapter.event.payload.event_data?.lastSuccessfulSyncStarted || adapter.state.lastSuccessfulSyncStarted;
      console.log(`Incremental sync using timestamp: ${modifiedSince || 'No timestamp found'}`);
    }
    
    console.log(`Extraction mode: ${isIncrementalMode ? 'INCREMENTAL' : 'INITIAL'}`);
    
    // Reset cards completion state for incremental sync
    if (isIncrementalMode) {
      console.log('Resetting cards completion state for incremental sync');
      adapter.state.cards = {
        ...adapter.state.cards,
        completed: false
        // Keep the before parameter if it exists for pagination
      };
    }
    
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
    
    // Initialize the repositories
    adapter.initializeRepos([
      { itemType: 'users', normalize: normalizeUser },
      { itemType: 'cards', normalize: normalizeCard }
    ]);
    
    // Extract users if not already completed
    if (!adapter.state.users.completed) {
      // Get organization ID from connection data
      const orgId = adapter.event.payload.connection_data?.org_id;
      if (!orgId) {
        throw new Error('Organization ID not found in connection data');
      }

      // Fetch the users from Trello
      const users = await trelloClient.getOrganizationMembers(orgId);
      console.log(`Successfully fetched ${users.length} users`);
      
      // Push the users to the repository
      await adapter.getRepo('users')?.push(users);
      console.log('Successfully pushed users data');
      
      // Update state to mark users as completed
      adapter.state = {
        ...adapter.state,
        users: { completed: true }
      };
    } else {
      console.log('Users already processed, skipping extraction');
    }
    
    // Initialize hasMoreCards variable at the function level
    let hasMoreCards = false;
    
    // Extract cards if not already completed
    if (!adapter.state.cards.completed) {
      // Get board ID from event context
      const boardId = adapter.event.payload.event_context?.external_sync_unit_id;
      if (!boardId) {
        throw new Error('Board ID not found in event context (external_sync_unit_id)');
      }
      
      // Pagination variables
      hasMoreCards = true;
      let beforeParam = adapter.state.cards.before;
      const PAGINATION_LIMIT = 100; 
      
      console.log(`Starting cards extraction for board ${boardId}${beforeParam ? ` with before=${beforeParam}` : ''}`);
      
      // Keep track of total cards and filtered cards
      let totalCardsFetched = 0;
      let totalCardsProcessed = 0;
      let filteredCards: any[] = [];

      // Fetch cards with pagination
      while (hasMoreCards) {
        // Fetch a page of cards
        const cards = await trelloClient.getBoardCards(boardId, PAGINATION_LIMIT, beforeParam);
        totalCardsFetched += cards.length;
        console.log(`Fetched ${cards.length} cards${beforeParam ? ` before ${beforeParam}` : ''}`);
        
        // Update the before parameter for the next page only if cards were returned
        if (cards.length > 0) {
          beforeParam = cards[0].id;
          
          // Update state with the new before parameter
          adapter.state = {
            ...adapter.state,
            cards: {
              ...adapter.state.cards,
              before: beforeParam
            }
          };
          
          // Collect all cards for later filtering
          filteredCards = [...filteredCards, ...cards];
          
          // Filter and push cards if in incremental mode
          if (isIncrementalMode && modifiedSince && modifiedSince.length > 0) {
            console.log(`Filtering cards modified since ${modifiedSince}`);
            const modifiedSinceDate = new Date(modifiedSince);
            const cardsToProcess = cards.filter(card => {
              if (!card.dateLastActivity) return false;
              const cardModifiedDate = new Date(card.dateLastActivity);
              return cardModifiedDate >= modifiedSinceDate;
            });
            
            totalCardsProcessed += cardsToProcess.length;
            console.log(`Found ${cardsToProcess.length} cards modified since ${modifiedSince} in this batch`);
            
            // Push filtered cards to the repository
            if (cardsToProcess.length > 0) {
              await adapter.getRepo('cards')?.push(cardsToProcess);
              console.log(`Successfully pushed ${cardsToProcess.length} cards after filtering`);
            } else {
              console.log('No cards to push after filtering in this batch');
            }
          }
        }
        
        // Check if we've reached the end of pagination
        if (cards.length < PAGINATION_LIMIT) {
          hasMoreCards = false;

          // Update state to mark cards as completed or not based on mode
          adapter.state = {
            ...adapter.state,
            cards: {
              ...adapter.state.cards,
              // In incremental mode, we don't mark cards as completed
              // This allows future incremental syncs to work correctly
              completed: !isIncrementalMode,
              // Clear the before parameter as we're done with pagination
              before: undefined
            }
          };
          
          // Store the modifiedSince timestamp in the state for future use
          if (isIncrementalMode && modifiedSince) {
            adapter.state.cards.modifiedSince = modifiedSince;
          }
          
          console.log(`Cards extraction completed, cards.completed set to ${!isIncrementalMode ? 'true' : 'false'} (incremental mode: ${isIncrementalMode})`);
          console.log(`Total cards fetched: ${totalCardsFetched}, Total cards processed: ${totalCardsProcessed}`);

          // In non-incremental mode, push all cards at the end
          if (!isIncrementalMode && filteredCards.length > 0) {
            // In non-incremental mode, push all cards
            console.log(`Pushing all ${filteredCards.length} cards in non-incremental mode`);
            await adapter.getRepo('cards')?.push(filteredCards);
            console.log(`Successfully pushed ${filteredCards.length} cards`);
          } else if (isIncrementalMode) {
            console.log(`Incremental mode completed, processed ${totalCardsProcessed} cards out of ${totalCardsFetched} fetched`);
          }
        }
      }
    } else {
      console.log('Cards already processed, skipping extraction');
    }
    
    // Check if extraction is complete
    // In incremental mode, we consider extraction complete when users are completed
    // and we've processed all pages of cards (hasMoreCards is false)
    const isIncrementalComplete = isIncrementalMode && 
                                 adapter.state.users.completed && 
                                 !hasMoreCards;
                                 
    if (adapter.state.users.completed && (adapter.state.cards.completed || isIncrementalComplete)) {
      // Emit the EXTRACTION_DATA_DONE event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
      console.log('Data extraction task completed successfully');
    } else {
      // Emit progress event if we're not done yet
      await adapter.emit(ExtractorEventType.ExtractionDataProgress);
      console.log('Data extraction in progress, emitting progress event');
    }
  } catch (error) {
    console.error('Error during data extraction:', error);
    // Emit error event
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { 
        message: error instanceof Error ? error.message : 'Unknown error during data extraction',
      },
    });
  }
}

// Re-export the attachment handlers and external sync handlers for backward compatibility
export { handleAttachmentsExtraction, getAttachmentStream, handleExternalSyncUnitsExtraction };