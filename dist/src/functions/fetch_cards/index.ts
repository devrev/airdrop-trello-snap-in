import { parseConnectionData, TrelloClient } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';
import { TrelloApiResponse } from '../../core/trello-client';

/**
 * Stage mapping rule: map list names to DevRev stages
 */
function mapListNameToStage(listName: string): string {
  const lowerName = listName.toLowerCase();
  
  if (lowerName.includes('backlog')) {
    return 'backlog';
  } else if (lowerName.includes('doing')) {
    return 'in_development';
  } else if (lowerName.includes('review')) {
    return 'in_review';
  } else if (lowerName.includes('done')) {
    return 'completed';
  } else if (lowerName.includes('archive')) {
    return 'completed';
  }
  
  // Default to backlog if no match
  return 'backlog';
}

/**
 * Convert card ID to creation date using hex timestamp
 */
function cardIdToCreatedDate(cardId: string): string {
  // First 8 characters of card ID are hex Unix timestamp
  const hexTimestamp = cardId.substring(0, 8);
  const unixTimestamp = parseInt(hexTimestamp, 16);
  const date = new Date(unixTimestamp * 1000);
  return date.toISOString();
}

/**
 * Normalize a Trello card to DevRev format
 */
function normalizeCard(card: any, listIdToNameMapping: Record<string, string>, createdById?: string): any {
  const createdDate = cardIdToCreatedDate(card.id);
  
  // Map stage using list name
  const listName = listIdToNameMapping[card.idList] || '';
  const stage = mapListNameToStage(listName);
  
  return {
    id: card.id,
    created_date: createdDate,
    modified_date: card.dateLastActivity || createdDate,
    data: {
      title: card.name,
      body: card.desc || null,
      target_close_date: card.due || null,
      stage: stage,
      item_url_field: card.url,
      owned_by_ids: card.idMembers || [],
      tags: card.idLabels || [],
      created_by_id: createdById || null,
      trello_due_complete: card.dueComplete || false,
      trello_position: card.pos,
      state: card.closed,
      trello_subscribed: card.subscribed || false,
      trello_cover_image: card.cover || null,
      trello_badges: card.badges || null,
      trello_start_date: card.start || null,
    },
  };
}

/**
 * Fetch cards from Trello with pagination support
 */
export default async function fetch_cards(events: FunctionInput[]) {
  const event = events[0];
  
  try {
    // Parse connection data
    const connectionDataKey = event.payload.connection_data?.key;
    if (!connectionDataKey) {
      throw new Error('Missing connection data key');
    }
    
    const credentials = parseConnectionData(connectionDataKey);
    const trelloClient = new TrelloClient(credentials);
    
    // Get board ID from input data
    const boardId = event.input_data?.global_values?.idBoard;
    if (!boardId) {
      throw new Error('Missing board ID in input data');
    }
    
    // Fetch lists for stage mapping
    const listsResponse = await trelloClient.getLists(boardId);
    if (listsResponse.status_code === 429) {
      return {
        status_code: 429,
        api_delay: listsResponse.api_delay,
        message: 'Rate limit exceeded while fetching lists',
      };
    }
    
    if (listsResponse.status_code !== 200) {
      return {
        status_code: listsResponse.status_code,
        api_delay: 0,
        message: `Failed to fetch lists: ${listsResponse.message}`,
      };
    }
    
    // Build list ID to name mapping
    const listIdToNameMapping: Record<string, string> = {};
    if (listsResponse.data) {
      for (const list of listsResponse.data) {
        listIdToNameMapping[list.id] = (list.name || '').toLowerCase();
      }
    }
    
    // Pagination state
    let before: string | undefined;
    let completed = false;
    const allNormalizedCards: any[] = [];
    
    // Pagination loop
    while (!completed) {
      // Fetch cards with pagination
      const cardsResponse: TrelloApiResponse = await trelloClient.getCards(boardId, 10, before);
      
      // Check for rate limiting
      if (cardsResponse.status_code === 429) {
        return {
          status_code: 429,
          api_delay: cardsResponse.api_delay,
          message: 'Rate limit exceeded while fetching cards',
        };
      }
      
      if (cardsResponse.status_code !== 200) {
        return {
          status_code: cardsResponse.status_code,
          api_delay: 0,
          message: `Failed to fetch cards: ${cardsResponse.message}`,
        };
      }
      
      const cards: any[] = cardsResponse.data || [];
      
      // Sort cards by creation date (ascending)
      const sortedCards: any[] = cards.sort((a: any, b: any) => {
        const dateA = cardIdToCreatedDate(a.id);
        const dateB = cardIdToCreatedDate(b.id);
        return dateA.localeCompare(dateB);
      });
      
      // Check if we should continue pagination
      if (sortedCards.length < 10) {
        completed = true;
        before = undefined;
      } else {
        before = sortedCards[0].id;
      }
      
      // Fetch created_by for each card
      let rateLimited = false;
      let delay = 0;
      
      const cardsWithCreator = await Promise.all(
        sortedCards.map(async (card: any) => {
          if (rateLimited) return null;
          
          const createActionResponse = await trelloClient.getCardCreateAction(card.id);
          
          if (createActionResponse.status_code === 429) {
            rateLimited = true;
            delay = createActionResponse.api_delay;
            return null;
          }
          
          let createdById: string | undefined = undefined;
          if (createActionResponse.status_code === 200 && createActionResponse.data) {
            const actions = Array.isArray(createActionResponse.data) 
              ? createActionResponse.data 
              : [createActionResponse.data];
            if (actions.length > 0) {
              createdById = actions[0].idMemberCreator;
            }
          }
          
          return { card, createdById };
        })
      );
      
      if (rateLimited) {
        return {
          status_code: 429,
          api_delay: delay,
          message: 'Rate limit exceeded while fetching card creators',
        };
      }
      
      // Normalize cards
      for (const item of cardsWithCreator) {
        if (item) {
          const normalizedCard = normalizeCard(item.card, listIdToNameMapping, item.createdById);
          allNormalizedCards.push(normalizedCard);
        }
      }
    }
    
    return {
      status_code: 200,
      api_delay: 0,
      message: `Successfully fetched ${allNormalizedCards.length} cards`,
      data: allNormalizedCards,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching cards:', errorMessage);
    throw error;
  }
}