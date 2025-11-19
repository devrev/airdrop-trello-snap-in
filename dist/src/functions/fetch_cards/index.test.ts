import { TrelloClient } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';
import fetch_cards from './index';

// Mock TrelloClient
jest.mock('../../core/trello-client');

describe('fetch_cards', () => {
  let mockTrelloClient: jest.Mocked<TrelloClient>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrelloClient = {
      getLists: jest.fn(),
      getCards: jest.fn(),
      getCardCreateAction: jest.fn(),
    } as any;
    
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => mockTrelloClient);
  });
  
  const createMockEvent = (boardId: string = 'board123'): FunctionInput => ({
    payload: {
      connection_data: {
        key: 'key=test_key&token=test_token',
      },
    },
    context: {
      dev_oid: 'test_org',
      source_id: 'test_source',
      snap_in_id: 'test_snap_in',
      snap_in_version_id: 'test_version',
      service_account_id: 'test_account',
      secrets: {},
    },
    execution_metadata: {
      request_id: 'test_request',
      function_name: 'fetch_cards',
      event_type: 'test_event',
      devrev_endpoint: 'https://api.devrev.ai',
    },
    input_data: {
      global_values: {
        idBoard: boardId,
      },
      event_sources: {},
    },
  });
  
  it('should successfully fetch cards with pagination', async () => {
    const mockLists = [
      { id: 'list1', name: 'To Do' },
      { id: 'list2', name: 'Doing' },
    ];
    
    const mockCards = [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'Card 1',
        desc: 'Description 1',
        due: null,
        idList: 'list1',
        url: 'https://trello.com/c/card1',
        idMembers: ['member1'],
        idLabels: ['label1'],
        dueComplete: false,
        pos: 1,
        closed: false,
        dateLastActivity: '2023-01-01T00:00:00.000Z',
        subscribed: false,
        cover: null,
        badges: {},
        start: null,
      },
    ];
    
    mockTrelloClient.getLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: mockLists,
    });
    
    mockTrelloClient.getCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: mockCards,
    });
    
    mockTrelloClient.getCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: [{ idMemberCreator: 'creator1' }],
    });
    
    const result = await fetch_cards([createMockEvent()]);
    
    expect(result.status_code).toBe(200);
    expect(result.data).toBeDefined();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].data.stage).toBe('backlog');
    expect(result.data![0].data.created_by_id).toBe('creator1');
  });
  
  it('should handle rate limiting when fetching lists', async () => {
    mockTrelloClient.getLists.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });
    
    const result = await fetch_cards([createMockEvent()]);
    
    expect(result.status_code).toBe(429);
    expect(result.api_delay).toBe(30);
    expect(result.message).toContain('Rate limit exceeded');
  });
  
  it('should handle rate limiting when fetching cards', async () => {
    mockTrelloClient.getLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: [],
    });
    
    mockTrelloClient.getCards.mockResolvedValue({
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded',
    });
    
    const result = await fetch_cards([createMockEvent()]);
    
    expect(result.status_code).toBe(429);
    expect(result.api_delay).toBe(60);
  });
  
  it('should handle rate limiting when fetching card creators', async () => {
    mockTrelloClient.getLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: [{ id: 'list1', name: 'To Do' }],
    });
    
    mockTrelloClient.getCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: [
        {
          id: '507f1f77bcf86cd799439011',
          name: 'Card 1',
          desc: '',
          due: null,
          idList: 'list1',
          url: 'https://trello.com/c/card1',
          idMembers: [],
          idLabels: [],
          dueComplete: false,
          pos: 1,
          closed: false,
          dateLastActivity: '2023-01-01T00:00:00.000Z',
          subscribed: false,
          cover: null,
          badges: {},
          start: null,
        },
      ],
    });
    
    mockTrelloClient.getCardCreateAction.mockResolvedValue({
      status_code: 429,
      api_delay: 45,
      message: 'Rate limit exceeded',
    });
    
    const result = await fetch_cards([createMockEvent()]);
    
    expect(result.status_code).toBe(429);
    expect(result.api_delay).toBe(45);
  });
  
  it('should map stage correctly based on list name', async () => {
    const mockLists = [
      { id: 'list1', name: 'Backlog' },
      { id: 'list2', name: 'Doing' },
      { id: 'list3', name: 'In Review' },
      { id: 'list4', name: 'Done' },
    ];
    
    mockTrelloClient.getLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: mockLists,
    });
    
    const mockCards = [
      { id: '507f1f77bcf86cd799439011', name: 'Card 1', idList: 'list1', url: 'url1', desc: '', due: null, idMembers: [], idLabels: [], dueComplete: false, pos: 1, closed: false, dateLastActivity: '2023-01-01T00:00:00.000Z', subscribed: false, cover: null, badges: {}, start: null },
      { id: '507f1f77bcf86cd799439012', name: 'Card 2', idList: 'list2', url: 'url2', desc: '', due: null, idMembers: [], idLabels: [], dueComplete: false, pos: 2, closed: false, dateLastActivity: '2023-01-01T00:00:00.000Z', subscribed: false, cover: null, badges: {}, start: null },
      { id: '507f1f77bcf86cd799439013', name: 'Card 3', idList: 'list3', url: 'url3', desc: '', due: null, idMembers: [], idLabels: [], dueComplete: false, pos: 3, closed: false, dateLastActivity: '2023-01-01T00:00:00.000Z', subscribed: false, cover: null, badges: {}, start: null },
      { id: '507f1f77bcf86cd799439014', name: 'Card 4', idList: 'list4', url: 'url4', desc: '', due: null, idMembers: [], idLabels: [], dueComplete: false, pos: 4, closed: false, dateLastActivity: '2023-01-01T00:00:00.000Z', subscribed: false, cover: null, badges: {}, start: null },
    ];
    
    mockTrelloClient.getCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: mockCards,
    });
    
    mockTrelloClient.getCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Success',
      data: [{ idMemberCreator: 'creator1' }],
    });
    
    const result = await fetch_cards([createMockEvent()]);
    
    expect(result.status_code).toBe(200);
    expect(result.data).toBeDefined();
    expect(result.data![0].data.stage).toBe('backlog');
    expect(result.data![1].data.stage).toBe('in_development');
    expect(result.data![2].data.stage).toBe('in_review');
    expect(result.data![3].data.stage).toBe('completed');
  });
  
  it('should throw error when connection data is missing', async () => {
    const event = createMockEvent();
    event.payload.connection_data = undefined;
    
    await expect(fetch_cards([event])).rejects.toThrow('Missing connection data key');
  });
  
  it('should throw error when board ID is missing', async () => {
    const event = createMockEvent();
    event.input_data.global_values = {};
    
    await expect(fetch_cards([event])).rejects.toThrow('Missing board ID in input data');
  });
});