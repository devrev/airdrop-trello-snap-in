import {
  readCredentialsFromEnv,
  loadEventPayload,
  sendEventToSnapIn,
  assertExists,
  assertStartsWith,
  assertArrayEquals,
} from './test-utils';

describe('fetch_cards conformance tests', () => {
  test('should fetch all cards with pagination and validate specific card fields', async () => {
    // Load credentials from environment
    const credentials = readCredentialsFromEnv();

    // Load event payload with credentials
    const event = loadEventPayload('fetch_cards_event.json', credentials);

    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);

    // Validate response status
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();

    // Validate response structure
    const responseData = response.data;
    expect(responseData.function_result).toBeDefined();
    
    const functionResult = responseData.function_result;
    expect(functionResult.status_code).toBe(200);
    expect(functionResult.data).toBeDefined();
    expect(Array.isArray(functionResult.data)).toBe(true);

    const cards = functionResult.data;

    // Validate pagination: expect exactly 12 cards
    if (cards.length !== 12) {
      throw new Error(
        `Expected 12 cards to be returned (validates pagination), but got ${cards.length} cards. ` +
        `This indicates that PaginationIterationRule was not applied correctly.`
      );
    }

    // Find specific card with ID "68e8befc8381b0efa25ce1eb"
    const specificCardId = '68e8befc8381b0efa25ce1eb';
    const specificCard = cards.find((card: any) => card.id === specificCardId);

    if (!specificCard) {
      throw new Error(
        `Expected to find card with ID "${specificCardId}" in the response, but it was not found. ` +
        `Available card IDs: ${cards.map((c: any) => c.id).join(', ')}`
      );
    }

    const context = `for card with ID ${specificCardId}`;

    // Validate card structure
    assertExists(specificCard.data, 'card.data', context);
    const cardData = specificCard.data;

    // Validate title starts with "Card1"
    assertStartsWith(cardData.title, 'Card1', 'card.data.title', context);

    // Validate body starts with "This is the description for card"
    assertStartsWith(
      cardData.body,
      'This is the description for card',
      'card.data.body',
      context
    );

    // Validate target_close_date exists
    assertExists(cardData.target_close_date, 'card.data.target_close_date', context);

    // Validate stage equals "backlog"
    if (cardData.stage !== 'backlog') {
      throw new Error(
        `Expected card.data.stage to equal "backlog" ${context}, but got: "${cardData.stage}"`
      );
    }

    // Validate item_url_field
    const expectedUrl = 'https://trello.com/c/eNOnhfkI/1-card1-59551f86-4abb-4f27-a93a-c3be5f63cc82';
    if (cardData.item_url_field !== expectedUrl) {
      throw new Error(
        `Expected card.data.item_url_field to equal "${expectedUrl}" ${context}, ` +
        `but got: "${cardData.item_url_field}"`
      );
    }

    // Validate owned_by_ids
    assertArrayEquals(
      cardData.owned_by_ids,
      ['6752eb529b14a3446b75e69c'],
      'card.data.owned_by_ids',
      context
    );

    // Validate tags
    assertArrayEquals(
      cardData.tags,
      ['68e8befbf2f641caa9b1e2b8', '68e8befbf2f641caa9b1e2b9', '68e8befbf2f641caa9b1e2ba'],
      'card.data.tags',
      context
    );

    // Validate trello_due_complete is false
    if (cardData.trello_due_complete !== false) {
      throw new Error(
        `Expected card.data.trello_due_complete to be false ${context}, ` +
        `but got: ${cardData.trello_due_complete}`
      );
    }

    // Validate trello_position exists
    assertExists(cardData.trello_position, 'card.data.trello_position', context);

    // Validate state is false
    if (cardData.state !== false) {
      throw new Error(
        `Expected card.data.state to be false ${context}, but got: ${cardData.state}`
      );
    }

    // Validate modified_date exists
    assertExists(specificCard.modified_date, 'card.modified_date', context);

    // Validate trello_subscribed is true
    if (cardData.trello_subscribed !== true) {
      throw new Error(
        `Expected card.data.trello_subscribed to be true ${context}, ` +
        `but got: ${cardData.trello_subscribed}`
      );
    }

    // Validate trello_cover_image exists
    assertExists(cardData.trello_cover_image, 'card.data.trello_cover_image', context);

    // Validate trello_badges exists
    assertExists(cardData.trello_badges, 'card.data.trello_badges', context);

    // Validate trello_start_date exists
    assertExists(cardData.trello_start_date, 'card.data.trello_start_date', context);

    // All validations passed
    console.log(`✓ Successfully validated all fields for card ${specificCardId}`);
    console.log(`✓ Pagination working correctly: fetched ${cards.length} cards`);
  });
});