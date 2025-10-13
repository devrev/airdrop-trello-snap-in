import { processTask, ExtractorEventType, EventType, SyncMode } from "@devrev/ts-adaas";
import { TrelloClient } from '../../../core/trello-client';
import { normalizeUser, normalizeCard, normalizeAttachment, ExtractionState, isCardModifiedAfter } from './data-extraction-utils';

processTask({
  task: async ({ adapter }) => {
    try {
      // Check if users extraction is already completed
      if ((adapter.state as any).users?.completed) {
        console.log('Users extraction already completed, skipping...');
        // Continue to cards extraction
      }

      // Get connection data and organization ID from the event
      const connectionData = adapter.event.payload.connection_data;
      const orgId = connectionData?.org_id;

      if (!connectionData || !connectionData.key) {
        throw new Error('Missing connection data or API key');
      }

      if (!orgId) {
        throw new Error('Missing organization ID in connection data');
      }

      // Get board ID from event context
      const boardId = adapter.event.payload.event_context?.external_sync_unit_id;
      if (!boardId) {
        throw new Error('Missing board ID in event context');
      }

      // Create Trello client
      const trelloClient = TrelloClient.fromConnectionData(connectionData.key);

      // Initialize repositories for users, cards, and attachments
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
          normalize: (rawAttachment: any) => normalizeAttachment(rawAttachment, rawAttachment.cardId),
        },
      ];
      adapter.initializeRepos(repos);

      // Extract users if not completed
      if (!(adapter.state as any).users?.completed) {
        console.log('Starting users extraction...');
        
        // Fetch users from organization
        const response = await trelloClient.getOrganizationMembers(orgId);

        if (response.status_code === 429) {
          await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
            delay: response.api_delay,
          });
          return;
        }

        if (response.status_code !== 200 || !response.data) {
          throw new Error(`Failed to fetch organization members: ${response.message}`);
        }

        // Push users to repository
        await adapter.getRepo('users')?.push(response.data);

        // Mark users extraction as completed
        const currentState = adapter.state as any;
        currentState.users = {
          completed: true,
        };
        
        console.log('Users extraction completed');
      }

      // Handle incremental mode for cards and attachments
      if (adapter.event.payload.event_type === EventType.ExtractionDataStart) {
        const mode = adapter.event.payload.event_context?.mode;
        if (mode === SyncMode.INCREMENTAL) {
          console.log('Incremental mode detected, resetting cards and attachments state');
          const currentState = adapter.state as any;
          currentState.cards = {
            completed: false,
            before: undefined,
            modifiedSince: currentState.lastSuccessfulSyncStarted,
          };
          currentState.attachments = { completed: false };
        }
      }

      // Extract cards if not completed
      if (!(adapter.state as any).cards?.completed) {
        console.log('Starting cards extraction...');
        
        const currentState = adapter.state as any;
        let hasMoreCards = true;
        
        while (hasMoreCards && !currentState.cards?.completed) {
          // Fetch cards with pagination
          const cardsResponse = await trelloClient.getBoardCards(
            boardId, 
            10, // ThePaginationLimit
            currentState.cards?.before
          );

          if (cardsResponse.status_code === 429) {
            await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
              delay: cardsResponse.api_delay,
            });
            return;
          }

          if (cardsResponse.status_code !== 200 || !cardsResponse.data) {
            throw new Error(`Failed to fetch board cards: ${cardsResponse.message}`);
          }

          const cards = cardsResponse.data;

          // Client-side filtering for incremental mode
          let filteredCards = cards;
          if (currentState.cards?.modifiedSince) {
            console.log(`Filtering cards modified after ${currentState.cards.modifiedSince}`);
            filteredCards = cards.filter(card => 
              isCardModifiedAfter(card, currentState.cards.modifiedSince)
            );
            console.log(`Filtered ${filteredCards.length} cards out of ${cards.length}`);
          }
          
          // Fetch creator information for all cards
          const cardsWithCreators = await Promise.all(
            filteredCards.map(async (card) => {
              try {
                const actionsResponse = await trelloClient.getCardActions(card.id, 'createCard', 'idMemberCreator');
                const createdBy = (actionsResponse.status_code === 200 && actionsResponse.data && actionsResponse.data.length > 0) 
                  ? actionsResponse.data[0].idMemberCreator || '' 
                  : '';
                return { ...card, createdBy };
              } catch (error) {
                console.error(`Failed to fetch creator for card ${card.id}:`, error);
                return { ...card, createdBy: '' };
              }
            })
          );
          
          // Push cards to repository
          if (cardsWithCreators.length > 0) {
            await adapter.getRepo('cards')?.push(cardsWithCreators);
            
            // Extract and push attachments from cards
            const attachments: any[] = [];
            cardsWithCreators.forEach(card => {
              if (card.attachments && Array.isArray(card.attachments)) {
                card.attachments.forEach((attachment: any) => {
                  attachments.push({ ...attachment, cardId: card.id });
                });
              }
            });
            
            if (attachments.length > 0) {
              await adapter.getRepo('attachments')?.push(attachments);
            }
          }

          // Update pagination state
          if (cards.length < 10) {
            // No more cards to fetch
            currentState.cards = {
              completed: true,
              before: '',
              modifiedSince: currentState.cards?.modifiedSince,
            };
            currentState.attachments = { completed: true };
            hasMoreCards = false;
          } else {
            // Update before parameter for next iteration
            currentState.cards = {
              completed: false,
              before: cards[0].id,
              modifiedSince: currentState.cards?.modifiedSince,
            };
          }
        }
        
        console.log('Cards extraction completed');
      }

      // Emit success event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
    } catch (error) {
      console.error('Data extraction error:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred during data extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    try {
      console.error('Data extraction timeout');
      
      // Emit progress event on timeout
      await adapter.emit(ExtractorEventType.ExtractionDataProgress);
    } catch (error) {
      console.error('Error handling timeout in data extraction:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  },
});