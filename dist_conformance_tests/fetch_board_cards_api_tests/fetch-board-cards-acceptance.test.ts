import axios from 'axios';
import { Server } from 'http';
import { getTestEnvironment, createCallbackServer, createBaseEvent, TestEnvironment } from './test-utils';

describe('fetch_board_cards acceptance test', () => {
  let callbackServer: Server;
  let env: TestEnvironment;
  const snapInServerUrl = 'http://localhost:8000/handle/sync';

  beforeAll(async () => {
    env = getTestEnvironment();
    const { server } = await createCallbackServer();
    callbackServer = server;
  });

  afterAll(async () => {
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => {
          resolve();
        });
      });
    }
  });

  describe('Acceptance Test - Specific Board Cards Fetch', () => {
    test('should fetch exactly 100 cards from board 688725dad59c015ce052eecf with limit 100 and no before parameter', async () => {
      const event = createBaseEvent(env, { limit: '100' });
      
      // Set the specific board ID as required by the acceptance test
      event.payload.event_context.external_sync_unit_id = '688725dad59c015ce052eecf';
      event.payload.event_context.external_sync_unit = '688725dad59c015ce052eecf';
      
      console.log('Sending request to fetch board cards with the following parameters:');
      console.log(`Board ID: ${event.payload.event_context.external_sync_unit_id}`);
      console.log(`Limit: ${event.input_data.global_values.limit}`);
      console.log(`Before parameter: ${event.input_data.global_values.before || 'not set'}`);

      const response = await axios.post(snapInServerUrl, event);

      // Verify the response structure
      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      
      const functionResult = response.data.function_result;
      
      // Log the API response for debugging
      console.log('API Response Details:');
      console.log(`Status Code: ${functionResult.status_code}`);
      console.log(`API Delay: ${functionResult.api_delay}`);
      console.log(`Message: ${functionResult.message}`);
      
      // Verify successful API call
      expect(functionResult.status_code).toBe(200);
      expect(functionResult.api_delay).toBeDefined();
      expect(functionResult.message).toBeDefined();
      
      // Verify cards are returned
      expect(functionResult.cards).toBeDefined();
      expect(Array.isArray(functionResult.cards)).toBe(true);
      
      const actualCardCount = functionResult.cards.length;
      console.log(`Number of cards returned: ${actualCardCount}`);
      
      // The core acceptance test requirement: expect exactly 100 cards
      if (actualCardCount !== 100) {
        console.error(`ACCEPTANCE TEST FAILURE: Expected exactly 100 cards, but received ${actualCardCount} cards`);
        console.error('This indicates that either:');
        console.error('1. The board does not contain exactly 100 cards');
        console.error('2. The API is not returning all available cards');
        console.error('3. There is an issue with the pagination or limit parameter handling');
        
        // Log first few cards for debugging if any were returned
        if (functionResult.cards.length > 0) {
          console.error('Sample of returned cards (first 3):');
          functionResult.cards.slice(0, 3).forEach((card: any, index: number) => {
            console.error(`Card ${index + 1}: ID=${card.id}, Name=${card.name}`);
          });
        }
      }
      
      // This is the critical assertion for the acceptance test
      expect(actualCardCount).toBe(100);
      
      // Additional validations to ensure data quality
      if (functionResult.cards.length > 0) {
        const firstCard = functionResult.cards[0];
        expect(firstCard.id).toBeDefined();
        expect(typeof firstCard.id).toBe('string');
        expect(firstCard.name).toBeDefined();
        expect(typeof firstCard.name).toBe('string');
        
        // Verify that attachments are included (as per the requirement)
        expect(firstCard.attachments).toBeDefined();
        expect(Array.isArray(firstCard.attachments)).toBe(true);
        
        console.log('Card data validation passed - cards contain required fields and attachments');
      }
      
      console.log('ACCEPTANCE TEST PASSED: Successfully fetched exactly 100 cards from the specified board');
    }, 60000); // Extended timeout for this specific test

    test('should fetch exactly 50 cards from board 688725dad59c015ce052eecf with limit 100 and before parameter 688725fdf26b3c50430cae23', async () => {
      const event = createBaseEvent(env, { limit: '100', before: '688725fdf26b3c50430cae23' });
      
      // Set the specific board ID as required by the acceptance test specification
      event.payload.event_context.external_sync_unit_id = '688725dad59c015ce052eecf';
      event.payload.event_context.external_sync_unit = '688725dad59c015ce052eecf';
      
      console.log('Sending request to fetch board cards with the following parameters:');
      console.log(`Board ID: ${event.payload.event_context.external_sync_unit_id}`);
      console.log(`Limit: ${event.input_data.global_values.limit}`);
      console.log(`Before parameter: ${event.input_data.global_values.before}`);

      const response = await axios.post(snapInServerUrl, event);

      // Verify the response structure
      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      
      const functionResult = response.data.function_result;
      
      // Log the API response for debugging
      console.log('API Response Details:');
      console.log(`Status Code: ${functionResult.status_code}`);
      console.log(`API Delay: ${functionResult.api_delay}`);
      console.log(`Message: ${functionResult.message}`);
      
      // Verify successful API call
      expect(functionResult.status_code).toBe(200);
      expect(functionResult.api_delay).toBeDefined();
      expect(functionResult.message).toBeDefined();
      
      // Verify cards are returned
      expect(functionResult.cards).toBeDefined();
      expect(Array.isArray(functionResult.cards)).toBe(true);
      
      const actualCardCount = functionResult.cards.length;
      console.log(`Number of cards returned: ${actualCardCount}`);
      
      // The core acceptance test requirement: expect exactly 50 cards
      if (actualCardCount !== 50) {
        console.error(`ACCEPTANCE TEST FAILURE: Expected exactly 50 cards, but received ${actualCardCount} cards`);
        console.error('This indicates that either:');
        console.error('1. The board does not contain the expected number of cards after the specified "before" parameter');
        console.error('2. The API pagination with "before" parameter is not working correctly');
        console.error('3. The "before" parameter value "688725fdf26b3c50430cae23" does not exist or is invalid');
        console.error('4. There is an issue with the limit parameter handling in combination with pagination');
        
        // Log first few cards for debugging if any were returned
        if (functionResult.cards.length > 0) {
          console.error('Sample of returned cards (first 3):');
          functionResult.cards.slice(0, 3).forEach((card: any, index: number) => {
            console.error(`Card ${index + 1}: ID=${card.id}, Name=${card.name}`);
          });
        }
        
        // Log additional debugging information
        console.error('Debugging information:');
        console.error(`Expected card count: 50`);
        console.error(`Actual card count: ${actualCardCount}`);
        console.error(`Board ID used: ${event.payload.event_context.external_sync_unit_id}`);
        console.error(`Limit parameter: ${event.input_data.global_values.limit}`);
        console.error(`Before parameter: ${event.input_data.global_values.before}`);
      }
      
      // This is the critical assertion for the acceptance test
      expect(actualCardCount).toBe(50);
      
      // Additional validations to ensure data quality
      if (functionResult.cards.length > 0) {
        const firstCard = functionResult.cards[0];
        expect(firstCard.id).toBeDefined();
        expect(typeof firstCard.id).toBe('string');
        expect(firstCard.name).toBeDefined();
        expect(typeof firstCard.name).toBe('string');
        
        // Verify that attachments are included (as per the requirement)
        expect(firstCard.attachments).toBeDefined();
        expect(Array.isArray(firstCard.attachments)).toBe(true);
        
        console.log('Card data validation passed - cards contain required fields and attachments');
        
        // Verify that none of the returned cards have the "before" ID (pagination correctness)
        const beforeCardFound = functionResult.cards.some((card: any) => card.id === event.input_data.global_values.before);
        if (beforeCardFound) {
          console.error('PAGINATION ERROR: Found a card with the "before" parameter ID in the results');
          console.error('This indicates that pagination is not working correctly');
        }
        expect(beforeCardFound).toBe(false);
      }
      
      console.log('ACCEPTANCE TEST PASSED: Successfully fetched exactly 50 cards from the specified board with pagination');
    }, 60000); // Extended timeout for this specific test
  });
});