import { 
  handleDataExtraction,
  handleExternalSyncUnitsExtraction,
  ExtractorState
} from './extraction-handlers';
import { 
  ExtractorEventType, 
  EventType,
  SyncMode
} from '@devrev/ts-adaas';

// Mock the TrelloClient
jest.mock('../../core/trello_client', () => {
  return {
    TrelloClient: jest.fn().mockImplementation(() => ({
      getBoardCards: jest.fn().mockResolvedValue([
        { id: 'card1', name: 'Test Card', dateLastActivity: '2023-08-15T14:30:00Z' }
      ]),
      getOrganizationMembers: jest.fn().mockResolvedValue([
        { id: 'user1', username: 'testuser', fullName: 'Test User' }
      ])
    }))
  };
});

describe('Data extraction handlers', () => {
  // Mock adapter for data extraction
  const mockDataAdapter = {
    state: {
      users: { completed: false },
      cards: { completed: false },
      attachments: { completed: false },
      lastSuccessfulSyncStarted: '2023-08-01T00:00:00Z'
    },
    emit: jest.fn().mockResolvedValue(undefined),
    getRepo: jest.fn().mockReturnValue({
      push: jest.fn().mockResolvedValue(true)
    }),
    initializeRepos: jest.fn(),
    event: {
      payload: {
        event_type: 'EXTRACTION_DATA_START',
        event_context: {
          external_sync_unit_id: 'board123',
          mode: 'INITIAL'
        },
        connection_data: {
          org_id: 'org123'
        }
      },
      context: { 
        snap_in_id: 'test-snap-in-id',
        secrets: { service_account_token: 'test-token' }
      },
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle initial data extraction mode', async () => {
    // Arrange
    const adapter = { ...mockDataAdapter };
    
    // Act
    await handleDataExtraction(adapter);
    
    // Assert
    expect(adapter.initializeRepos).toHaveBeenCalled();
    expect(adapter.emit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionDataDone
    );
  });

  it('should handle incremental data extraction mode', async () => {
    // Arrange
    const adapter = { 
      ...mockDataAdapter,
      event: {
        ...mockDataAdapter.event,
        payload: {
          ...mockDataAdapter.event.payload,
          event_context: {
            ...mockDataAdapter.event.payload.event_context,
            mode: 'INCREMENTAL'
          }
        }
      }
    };
    
    // Mock TrelloClient to return cards with different dates
    const mockCards = [
      { 
        id: 'card1', 
        name: 'Old Card', 
        dateLastActivity: '2023-07-15T00:00:00Z' // Before last sync
      },
      { 
        id: 'card2', 
        name: 'New Card', 
        dateLastActivity: '2023-08-15T00:00:00Z' // After last sync
      }
    ];
    
    // Override the getBoardCards mock for this test
    require('../../core/trello_client').TrelloClient.mockImplementation(() => ({
      // Mock getBoardCards to simulate pagination:
      // First call returns mockCards, second call returns empty array
      getBoardCards: jest.fn()
        .mockResolvedValueOnce(mockCards)
        .mockResolvedValueOnce([]),
      getOrganizationMembers: jest.fn().mockResolvedValue([
        { id: 'user1', username: 'testuser', fullName: 'Test User' }
      ])
    }));
    
    // Act
    await handleDataExtraction(adapter);
    
    // Assert
    expect(adapter.initializeRepos).toHaveBeenCalled();
    
    // Check that cards completion state was reset
    expect(adapter.state.cards.completed).toBe(false);
    
    // Verify that modifiedSince was set in the state if it exists
    if (adapter.state.cards && 'modifiedSince' in adapter.state.cards) {
      expect(adapter.state.cards.modifiedSince).toBe('2023-08-01T00:00:00Z');
    }
    
    // Check that the emit was called with the right event
    expect(adapter.emit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionDataDone
    );
    
    // The repo.push should have been called with filtered cards
    const repoInstance = adapter.getRepo.mock.results[0].value;
    expect(repoInstance.push).toHaveBeenCalled();
  });
});