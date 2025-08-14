import { invokeExtractionFunction } from './utils/test-helpers';
import { CallbackServer, CallbackEvent } from './utils/callback-server';

describe('Extraction Function Tests', () => {
  const callbackServer = new CallbackServer();
  
  beforeAll(async () => {
    await callbackServer.start();
  });
  
  afterAll(async () => {
    await callbackServer.stop();
    // Add a small delay to ensure all connections are closed
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  beforeEach(() => {
    callbackServer.clearEvents();
  });

  // Test 1: Basic test - Verify that the extraction function can be invoked
  test('should successfully invoke extraction function with EXTRACTION_DATA_START event', async () => {
    // Arrange
    callbackServer.clearEvents();
    
    // Act
    const result = await invokeExtractionFunction('EXTRACTION_DATA_START');
    
    // Wait for callback to be received
    await new Promise(resolve => setTimeout(resolve, 3000));
    const events = callbackServer.getEvents();
    
    // Assert
    expect(result).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
    
    const lastEvent = events[events.length - 1] as CallbackEvent;
    expect(lastEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    expect(lastEvent.event_data.artifacts).toBeDefined();
    expect(lastEvent.event_data.artifacts.length).toBeGreaterThan(0);
  });

  // Test 2: Simple test - Verify users data extraction
  test('should extract users data when state shows users not completed', async () => {
    // Arrange
    callbackServer.clearEvents();
    const initialState = {
      users: { completed: false },
      cards: { completed: false }
    };
    
    // Act
    const result = await invokeExtractionFunction('EXTRACTION_DATA_START', initialState);
    
    // Wait for callback to be received
    await new Promise(resolve => setTimeout(resolve, 3000));
    const events = callbackServer.getEvents();
    
    // Assert
    expect(result).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
    
    const lastEvent = events[events.length - 1] as CallbackEvent;
    expect(lastEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify users were extracted
    const userArtifact = lastEvent.event_data.artifacts.find(a => a.item_type === 'users');
    expect(userArtifact).not.toBeUndefined();
    if (userArtifact) {
      expect(userArtifact.item_count).toBeGreaterThan(0);
    }
  });

  // Test 3: Intermediate test - Verify cards data extraction with pagination
  test('should extract cards data with pagination', async () => {
    // Arrange
    callbackServer.clearEvents();
    const initialState = {
      users: { completed: true }, // Users already completed
      cards: { completed: false } // Cards not completed
    };
    
    // Act
    const result = await invokeExtractionFunction('EXTRACTION_DATA_START', initialState);
    
    // Wait for callback to be received
    await new Promise(resolve => setTimeout(resolve, 3000));
    const events = callbackServer.getEvents();
    
    // Assert
    expect(result).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
    
    const lastEvent = events[events.length - 1] as CallbackEvent;
    expect(lastEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify cards were extracted
    const cardArtifact = lastEvent.event_data.artifacts.find(a => a.item_type === 'cards');
    expect(cardArtifact).not.toBeUndefined();
    if (cardArtifact) {
      expect(cardArtifact.item_count).toBeGreaterThan(0);
    }
  });

  // Test 4: Complex test - Verify resuming pagination from a specific point
  test('should resume cards extraction from the specified pagination point', async () => {
    // Arrange
    callbackServer.clearEvents();
    // Set a specific "before" parameter to test pagination resumption
    const initialState = {
      users: { completed: true },
      cards: { 
        completed: false,
        before: '688725fdf26b3c50430cae23' // Use the known card ID
      }
    };
    
    // Act
    const result = await invokeExtractionFunction('EXTRACTION_DATA_CONTINUE', initialState);
    
    // Wait for callback to be received
    await new Promise(resolve => setTimeout(resolve, 3000));
    const events = callbackServer.getEvents();
    
    // Assert
    expect(result).toBeDefined();
    expect(events.length).toBeGreaterThan(0);
    
    const lastEvent = events[events.length - 1] as CallbackEvent;
    expect(lastEvent.event_type).toBe('EXTRACTION_DATA_DONE');
  });
});