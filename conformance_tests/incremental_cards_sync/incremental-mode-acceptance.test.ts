import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  createCallbackServer, 
  generateExtractionEvent,
  sendEventToSnapIn,
  updateTrelloCard,
  findTestCard,
  waitForCallbackResponseWithRetry,
  findCardsArtifact,
  validateCallbackResponse
} from './test-utils';
import { Server } from 'http';

describe('Incremental Mode Acceptance Test', () => {
  let callbackServer: Server;
  let callbackResponses: any[] = [];
  let addCallbackResponse: (response: any) => void = () => {};
  let initialSyncTimestamp: string; 
  const CARD_ID = '688725fd3e26ebcf364bff4a';

  beforeAll(async () => {
    // Set up the callback server
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    addCallbackResponse = (response) => {
      callbackResponses.push(response);
    };
    serverSetup.setResponseHandler(addCallbackResponse);
  });

  afterAll(async () => {
    // Close the callback server
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => resolve());
      });
    }
  });

  beforeEach(() => {
    // Clear callback responses before each test
    callbackResponses = [];
  });

  test('Incremental mode should only sync updated cards', async () => {
    jest.setTimeout(120000); // Increase timeout for this test
    // Step 1: Initial extraction
    
    // Find a suitable card to update
    let cardId;
    try {
      cardId = await findTestCard('6752eb962a64828e59a35396');
      console.log(`Using card ID: ${cardId} for testing`);
    } catch (error) {
      console.error('Failed to find a test card:', error);
      cardId = CARD_ID; // Fallback to the default card ID
    }
    
    console.log('Starting initial extraction...');
    callbackResponses = []; // Clear responses before starting
    const initialEvent = generateExtractionEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const initialResponse = await sendEventToSnapIn(initialEvent);
    expect(initialResponse).toBeDefined();
    expect(initialResponse.function_result).toBeDefined();
    expect(initialResponse.function_result.success).toBe(true);
    
    // Wait for the callback response with EXTRACTION_DATA_DONE
    console.log('Waiting for initial extraction to complete...');
    const initialCallbackResponse = await waitForCallbackResponseWithRetry(
      callbackResponses,
      (response) => response.body.event_type === 'EXTRACTION_DATA_DONE',
      60000
    );
    
    // Validate the callback response
    validateCallbackResponse(initialCallbackResponse, 'EXTRACTION_DATA_DONE');
    console.log('Initial extraction completed successfully');

    // Store the timestamp after initial extraction completes, but subtract 1 second
    // to ensure we don't miss any updates due to timing precision issues
    const now = new Date();
    now.setSeconds(now.getSeconds() - 1); // Subtract 1 second to create a buffer
    initialSyncTimestamp = now.toISOString();
    console.log(`Storing timestamp for incremental sync (with 1s buffer): ${initialSyncTimestamp}`);
    callbackResponses = []; // Clear responses before updating card
    
    // Step 2: Update a specific card
    const uuid = uuidv4();
    const newCardName = `Updated-Card-${uuid}`;
    console.log(`Updating card ${cardId} with name "${newCardName}"...`);

    try {
      const updatedCard = await updateTrelloCard(cardId, { name: newCardName });
      console.log('Card updated successfully:', updatedCard.name);
      
      // Verify the card was actually updated
      if (updatedCard.name !== newCardName) {
        throw new Error(`Card name was not updated correctly. Expected: ${newCardName}, Got: ${updatedCard.name}`);
      }
      
      // Log the card's last activity date for debugging
      console.log(`Card last activity date: ${updatedCard.dateLastActivity}`);
      console.log(`Our timestamp for comparison: ${initialSyncTimestamp}`);
    } catch (error) {
      console.error('Failed to update card:', error);
      throw error;
    }
    // Wait a moment to ensure the update is processed and has a timestamp after our stored timestamp
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Incremental extraction
    console.log('Starting incremental extraction...');
    callbackResponses = []; // Clear responses before incremental sync
    // Use the timestamp from after the initial extraction completed
    // This ensures we only get cards modified after the initial extraction
    const incrementalEvent = generateExtractionEvent('EXTRACTION_DATA_START', true, initialSyncTimestamp, true);
    
    // Send the event to the snap-in server
    const incrementalResponse = await sendEventToSnapIn(incrementalEvent);
    expect(incrementalResponse).toBeDefined();
    expect(incrementalResponse.function_result).toBeDefined();
    expect(incrementalResponse.function_result.success).toBe(true);
    
    // Wait for the callback response with EXTRACTION_DATA_DONE
    console.log('Waiting for incremental extraction to complete...');
    const incrementalCallbackResponse = await waitForCallbackResponseWithRetry(
      callbackResponses,
      (response) => response.body.event_type === 'EXTRACTION_DATA_DONE',
      60000
    );
    
    // Validate the callback response
    validateCallbackResponse(incrementalCallbackResponse, 'EXTRACTION_DATA_DONE');
    
    console.log('Incremental callback response received');
    
    // Try to find the cards artifact in the response
    let cardsArtifact = findCardsArtifact(incrementalCallbackResponse.body.event_data);
    
    // If no cards artifact is found, retry the incremental sync
    if (!cardsArtifact) {
      try {
        console.log('No cards artifact found in the response. Retrying incremental sync...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        // Send another incremental sync event
        callbackResponses = []; // Clear responses before retrying
        const retryResponse = await sendEventToSnapIn(incrementalEvent);
        expect(retryResponse.function_result.success).toBe(true);
        
        // Wait for the callback response
        const retryCallbackResponse = await waitForCallbackResponseWithRetry(
          callbackResponses,
          (response) => response.body.event_type === 'EXTRACTION_DATA_DONE',
          60000
        );
        
        // Try to find the cards artifact in the retry response
        cardsArtifact = findCardsArtifact(retryCallbackResponse.body.event_data);
      } catch (error) {
        console.error('Error during retry:', error);
        throw new Error(`Failed to get cards artifact after retry: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // If we still don't have a cards artifact, the test will fail
      expect(cardsArtifact).toBeDefined();
      expect(cardsArtifact.item_count).toBe(1);
      
      console.log('Incremental extraction completed successfully with exactly 1 card synced');
    } else {
      expect(cardsArtifact.item_count).toBe(1);
      
      console.log('Incremental extraction completed successfully with exactly 1 card synced');
    }
  }, 120000); // 2 minute timeout
});