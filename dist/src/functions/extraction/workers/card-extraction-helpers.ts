import { TrelloClient } from '../../../core/trello-client';
import { checkRateLimit } from './extraction-helpers';

export interface CardWithMetadata {
  card: any;
  createdById: string | undefined;
  comments: any[];
  attachments: any[];
}

/**
 * Fetch metadata (creator and comments) for multiple cards
 * Returns null if rate limited, otherwise returns array of cards with metadata
 */
export async function fetchCardsMetadata(
  trelloClient: TrelloClient,
  cards: any[]
): Promise<{ cards: CardWithMetadata[]; rateLimited: boolean; delay: number }> {
  let rateLimited = false;
  let delay = 0;

  const cardsWithMetadata = await Promise.all(
    cards.map(async (card: any) => {
      if (rateLimited) return null;

      // Fetch card creator
      const createActionResponse = await trelloClient.getCardCreateAction(card.id);

      const createActionDelay = checkRateLimit(createActionResponse);
      if (createActionDelay > 0) {
        rateLimited = true;
        delay = createActionDelay;
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

      // Fetch comments for this card
      const commentsResponse = await trelloClient.getComments(card.id);

      const commentsDelay = checkRateLimit(commentsResponse);
      if (commentsDelay > 0) {
        rateLimited = true;
        delay = commentsDelay;
        return null;
      }

      let comments: any[] = [];
      if (commentsResponse.status_code === 200 && commentsResponse.data) {
        comments = commentsResponse.data;
      }

      // Extract attachments from card (already included in card response when attachments=true)
      const attachments: any[] = card.attachments || [];

      return { card, createdById, comments, attachments };
    })
  );

  const validCards = cardsWithMetadata.filter(
    (item): item is CardWithMetadata => item !== null
  );

  return { cards: validCards, rateLimited, delay };
}

/**
 * Prepare cards for normalization by embedding context
 */
export function prepareCardsForNormalization(
  cardsWithMetadata: CardWithMetadata[],
  listIdToNameMapping: Record<string, string>
): any[] {
  return cardsWithMetadata.map((item) => ({
    ...item.card,
    createdById: item.createdById,
    listIdToNameMapping: listIdToNameMapping,
  }));
}

/**
 * Extract all comments from cards with metadata
 */
export function extractCommentsFromCards(cardsWithMetadata: CardWithMetadata[]): any[] {
  return cardsWithMetadata.flatMap((item) => item.comments);
}

/**
 * Extract all attachments from cards with metadata and prepare for normalization
 */
export function extractAttachmentsFromCards(cardsWithMetadata: CardWithMetadata[]): any[] {
  return cardsWithMetadata.flatMap((item) =>
    item.attachments.map((attachment) => ({
      ...attachment,
      cardId: item.card.id,
    }))
  );
}