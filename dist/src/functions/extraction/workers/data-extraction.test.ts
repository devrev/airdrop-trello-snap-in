import { ExtractorEventType, WorkerAdapter, SyncMode } from '@devrev/ts-adaas';
import { ExtractorState } from '../index';
import { TrelloClient, parseConnectionData } from '../../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../../core/trello-client', () => {
  const mockGetOrganizationMembers = jest.fn();
  const mockGetMemberDetails = jest.fn();
  const mockGetLabels = jest.fn();
  const mockGetLists = jest.fn();
  const mockGetCards = jest.fn();
  const mockGetCardCreateAction = jest.fn();
  const mockGetComments = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    getOrganizationMembers: mockGetOrganizationMembers,
    getMemberDetails: mockGetMemberDetails,
    getLabels: mockGetLabels,
    getLists: mockGetLists,
    getCards: mockGetCards,
    getCardCreateAction: mockGetCardCreateAction,
    getComments: mockGetComments,
  }));

  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.fn((key: string) => {
      const params = new URLSearchParams(key);
      return {
        apiKey: params.get('key') || '',
        token: params.get('token') || '',
      };
    }),
    __mockGetOrganizationMembers: mockGetOrganizationMembers,
    __mockGetMemberDetails: mockGetMemberDetails,
    __mockGetLabels: mockGetLabels,
    __mockGetLists: mockGetLists,
    __mockGetCards: mockGetCards,
    __mockGetCardCreateAction: mockGetCardCreateAction,
    __mockGetComments: mockGetComments,
  };
});

// Mock the processTask function
jest.mock('@devrev/ts-adaas', () => {
  const actual = jest.requireActual('@devrev/ts-adaas');
  return {
    ...actual,
    processTask: jest.fn(({ task }) => {
      // Store the task function for testing
      (global as any).__testTask = task;
    }),
  };
});

// Get mock functions at module level
const {
  __mockGetOrganizationMembers,
  __mockGetMemberDetails,
  __mockGetLabels,
  __mockGetLists,
  __mockGetCards,
  __mockGetCardCreateAction,
  __mockGetComments,
} = require('../../../core/trello-client');

describe('data-extraction worker', () => {
  let mockAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock push functions
    const mockUsersPush = jest.fn();
    const mockLabelsPush = jest.fn();
    const mockCardsPush = jest.fn();
    const mockCommentsPush = jest.fn();

    // Create mock adapter
    mockAdapter = {
      event: {
        payload: {
          connection_data: {
            key: 'key=test-api-key&token=test-token',
            org_id: 'test-org-id',
          },
          event_context: {
            external_sync_unit_id: 'test-board-id',
            mode: 'INITIAL',
          },
        },
      },
      state: {
        users: { completed: false },
        labels: { completed: false },
        cards: { completed: false },
        comments: { completed: false },
        attachments: { completed: false },
        lastSuccessfulSyncStarted: '2023-01-01T00:00:00.000Z',
      },
      initializeRepos: jest.fn(),
      getRepo: jest.fn((itemType: string) => {
        if (itemType === 'users') {
          return { push: mockUsersPush };
        } else if (itemType === 'labels') {
          return { push: mockLabelsPush };
        } else if (itemType === 'cards') {
          return { push: mockCardsPush };
        } else if (itemType === 'comments') {
          return { push: mockCommentsPush };
        }
        return null;
      }),
      emit: jest.fn(),
    };

    __mockGetOrganizationMembers.mockReset();
    __mockGetMemberDetails.mockReset();
    __mockGetLabels.mockReset();
    __mockGetLists.mockReset();
    __mockGetCards.mockReset();
    __mockGetCardCreateAction.mockReset();
    __mockGetComments.mockReset();
  });

  it('should successfully extract users, labels, cards, and comments', async () => {
    const mockMembers = [
      {
        id: '6752eb52',
        fullName: 'John Doe',
        username: 'johndoe',
      },
    ];

    const mockLabels = [
      {
        id: '68e8befb',
        name: 'Bug',
        color: 'red',
      },
      {
        id: '68e8befc',
        name: '',
        color: 'green',
      },
    ];

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    const mockCards = [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'Card 1',
        desc: 'Description 1',
        due: null,
        idList: 'list1',
        url: 'https://trello.com/c/card1',
        idMembers: ['6752eb52'],
        idLabels: ['68e8befb'],
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

    const mockComments = [
      {
        id: '6903676ae620c67577973190',
        idMemberCreator: '6752eb529b14a3446b75e69c',
        data: {
          idCard: '507f1f77bcf86cd799439011',
          text: 'Test comment',
          board: {
            id: 'test-board-id',
          },
          dateLastEdited: '2023-01-02T00:00:00.000Z',
        },
        memberCreator: {
          username: 'johndoe',
        },
        date: '2023-01-01T00:00:00.000Z',
      },
    ];

    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched member details',
      data: { email: 'john@example.com' },
    });

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: [{ idMemberCreator: '6752eb52' }],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;
    expect(task).toBeDefined();

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify repositories were initialized
    expect(mockAdapter.initializeRepos).toHaveBeenCalledWith([
      {
        itemType: 'users',
        normalize: expect.any(Function),
      },
      {
        itemType: 'labels',
        normalize: expect.any(Function),
      },
      {
        itemType: 'cards',
        normalize: expect.any(Function),
      },
      {
        itemType: 'comments',
        normalize: expect.any(Function),
      },
      {
        itemType: 'attachments',
        normalize: expect.any(Function),
      },
    ]);

    // Verify users were pushed to repository
    const usersRepo = mockAdapter.getRepo('users');
    expect(usersRepo.push).toHaveBeenCalledWith([
      {
        id: '6752eb52',
        full_name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
      },
    ]);

    // Verify labels were pushed to repository
    const labelsRepo = mockAdapter.getRepo('labels');
    expect(labelsRepo.push).toHaveBeenCalledWith([
      {
        id: '68e8befb',
        name: 'Bug',
        color: 'red',
      },
      {
        id: '68e8befc',
        name: '',
        color: 'green',
      },
    ]);

    // Verify cards were pushed to repository
    const cardsRepo = mockAdapter.getRepo('cards');
    expect(cardsRepo.push).toHaveBeenCalled();

    // Verify comments were pushed to repository
    const commentsRepo = mockAdapter.getRepo('comments');
    expect(commentsRepo.push).toHaveBeenCalled();

    // Verify state was updated
    expect(mockAdapter.state.users.completed).toBe(true);
    expect(mockAdapter.state.labels.completed).toBe(true);
    expect(mockAdapter.state.cards.completed).toBe(true);
    expect(mockAdapter.state.comments.completed).toBe(true);

    // Verify completion event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
  });

  it('should skip cards extraction if already completed', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.state.attachments.completed = true;

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify no cards API calls were made
    expect(__mockGetLists).not.toHaveBeenCalled();
    expect(__mockGetCards).not.toHaveBeenCalled();

    // Verify completion event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
  });

  it('should handle rate limiting when fetching lists', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.comments.completed = false;

    __mockGetLists.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 30,
    });

    // Verify state was not updated
    expect(mockAdapter.state.cards.completed).toBe(false);
  });

  it('should handle rate limiting when fetching cards', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.comments.completed = false;

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: [],
    });

    __mockGetCards.mockResolvedValue({
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 60,
    });

    // Verify state was not updated
    expect(mockAdapter.state.cards.completed).toBe(false);
  });

  it('should handle rate limiting when fetching card creators', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.comments.completed = false;

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    const mockCards = [
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
    ];

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 429,
      api_delay: 45,
      message: 'Rate limit exceeded',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 45,
    });
  });

  it('should handle rate limiting when fetching comments', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.comments.completed = false;

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    const mockCards = [
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
    ];

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: [{ idMemberCreator: '6752eb52' }],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 429,
      api_delay: 45,
      message: 'Rate limit exceeded',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 45,
    });
  });

  it('should handle pagination correctly', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.comments.completed = false;

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    // First page with 10 cards
    const mockCardsPage1 = Array.from({ length: 10 }, (_, i) => ({
      id: `507f1f77bcf86cd79943901${i}`,
      name: `Card ${i}`,
      desc: '',
      due: null,
      idList: 'list1',
      url: `https://trello.com/c/card${i}`,
      idMembers: [],
      idLabels: [],
      dueComplete: false,
      pos: i,
      closed: false,
      dateLastActivity: '2023-01-01T00:00:00.000Z',
      subscribed: false,
      cover: null,
      badges: {},
      start: null,
    }));

    // Second page with 5 cards (less than 10, should complete)
    const mockCardsPage2 = Array.from({ length: 5 }, (_, i) => ({
      id: `507f1f77bcf86cd79943902${i}`,
      name: `Card ${i + 10}`,
      desc: '',
      due: null,
      idList: 'list1',
      url: `https://trello.com/c/card${i + 10}`,
      idMembers: [],
      idLabels: [],
      dueComplete: false,
      pos: i + 10,
      closed: false,
      dateLastActivity: '2023-01-01T00:00:00.000Z',
      subscribed: false,
      cover: null,
      badges: {},
      start: null,
    }));

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched cards',
        data: mockCardsPage1,
      })
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched cards',
        data: mockCardsPage2,
      });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: [{ idMemberCreator: '6752eb52' }],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify cards were fetched twice (pagination)
    expect(__mockGetCards).toHaveBeenCalledTimes(2);

    // Verify state was updated correctly
    expect(mockAdapter.state.cards.completed).toBe(true);
    expect(mockAdapter.state.cards.before).toBeUndefined();
  });

  it('should normalize users correctly', async () => {
    mockAdapter.state.comments.completed = true;
    const mockMembers = [
      {
        id: '6752eb52',
        fullName: 'John Doe',
        username: 'johndoe',
      },
    ];

    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched member details',
      data: { email: 'john@example.com' },
    });

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: [],
    });

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: [],
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: [],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify the normalize function is working correctly
    const normalizeFunc = mockAdapter.initializeRepos.mock.calls[0][0][0].normalize;
    const normalizedUser = normalizeFunc({
      id: '6752eb52',
      full_name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
    });

    expect(normalizedUser).toMatchObject({
      id: '6752eb52',
      created_date: expect.any(String),
      modified_date: expect.any(String),
      data: {
        id: '6752eb52',
        full_name: 'John Doe',
        username: 'johndoe',
        email: 'john@example.com',
      },
    });
  });

  it('should normalize labels correctly', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    const mockLabels = [
      {
        id: '68e8befb',
        name: 'Bug',
        color: 'red',
      },
    ];

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify the normalize function is working correctly
    const normalizeFunc = mockAdapter.initializeRepos.mock.calls[0][0][1].normalize;
    const normalizedLabel = normalizeFunc({
      id: '68e8befb',
      name: 'Bug',
      color: 'red',
    });

    expect(normalizedLabel).toMatchObject({
      id: '68e8befb',
      created_date: expect.any(String),
      modified_date: expect.any(String),
      data: {
        id: '68e8befb',
        name: 'Bug',
        color: '#FF0000',
        description: ['Bug'],
      },
    });
  });

  it('should normalize labels with empty names correctly', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    const mockLabels = [
      {
        id: '68e8befb',
        name: '',
        color: 'blue',
      },
    ];

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify the normalize function is working correctly
    const normalizeFunc = mockAdapter.initializeRepos.mock.calls[0][0][1].normalize;
    const normalizedLabel = normalizeFunc({
      id: '68e8befb',
      name: '',
      color: 'blue',
    });

    expect(normalizedLabel).toMatchObject({
      id: '68e8befb',
      created_date: expect.any(String),
      modified_date: expect.any(String),
      data: {
        id: '68e8befb',
        name: 'label-blue',
        color: '#0000FF',
        description: ['label-blue'],
      },
    });
  });

  it('should skip users extraction if already completed', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.state.attachments.completed = true;

    const mockLabels = [
      {
        id: '68e8befb',
        name: 'Bug',
        color: 'red',
      },
    ];

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify no users API calls were made
    expect(__mockGetOrganizationMembers).not.toHaveBeenCalled();

    // Verify labels were fetched
    expect(__mockGetLabels).toHaveBeenCalled();

    // Verify completion event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
  });

  it('should skip labels extraction if already completed', async () => {
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.state.attachments.completed = true;

    const mockMembers = [
      {
        id: '6752eb52',
        fullName: 'John Doe',
        username: 'johndoe',
      },
    ];

    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched member details',
      data: { email: 'john@example.com' },
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify users were fetched
    expect(__mockGetOrganizationMembers).toHaveBeenCalled();

    // Verify no labels API calls were made
    expect(__mockGetLabels).not.toHaveBeenCalled();

    // Verify completion event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
  });

  it('should handle rate limiting on labels fetch', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    __mockGetLabels.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 30,
    });

    // Verify state was not updated
    expect(mockAdapter.state.labels.completed).toBe(false);
  });

  it('should handle API errors on labels fetch', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    __mockGetLabels.mockResolvedValue({
      status_code: 500,
      api_delay: 0,
      message: 'Internal server error',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: { message: 'Internal server error' },
    });

    // Verify state was not updated
    expect(mockAdapter.state.labels.completed).toBe(false);
  });

  it('should handle rate limiting on organization members fetch', async () => {
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 30,
    });

    // Verify state was not updated
    expect(mockAdapter.state.users.completed).toBe(false);
    expect(mockAdapter.state.labels.completed).toBe(false);
  });

  it('should handle rate limiting on member details fetch', async () => {
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    const mockMembers = [
      {
        id: '6752eb52',
        fullName: 'John Doe',
        username: 'johndoe',
      },
      {
        id: '6752eb53',
        fullName: 'Jane Smith',
        username: 'janesmith',
      },
    ];

    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched member details',
        data: { email: 'john@example.com' },
      })
      .mockResolvedValueOnce({
        status_code: 429,
        api_delay: 15,
        message: 'Rate limit exceeded',
      });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
      delay: 15,
    });

    // Verify state was not updated
    expect(mockAdapter.state.users.completed).toBe(false);
    expect(mockAdapter.state.labels.completed).toBe(false);
  });

  it('should handle API errors on users fetch', async () => {
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 500,
      api_delay: 0,
      message: 'Internal server error',
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: { message: 'Internal server error' },
    });

    // Verify state was not updated
    expect(mockAdapter.state.users.completed).toBe(false);
    expect(mockAdapter.state.labels.completed).toBe(false);
  });

  it('should handle missing connection data key', async () => {
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.event.payload.connection_data.key = '';

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: { message: 'Missing connection data key' },
    });
  });

  it('should handle missing organization ID', async () => {
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.event.payload.connection_data.org_id = '';

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: { message: 'Missing organization ID' },
    });
  });

  it('should handle missing board ID', async () => {
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.event.payload.event_context.external_sync_unit_id = '';

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
      error: { message: 'Missing board ID' },
    });
  });

  it('should convert all colors to correct hex codes', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    const colorTests = [
      { color: 'green', hex: '#008000' },
      { color: 'blue', hex: '#0000FF' },
      { color: 'orange', hex: '#FFA500' },
      { color: 'purple', hex: '#800080' },
      { color: 'red', hex: '#FF0000' },
      { color: 'yellow', hex: '#FFFF00' },
      { color: 'black', hex: '#000000' },
      { color: 'white', hex: '#FFFFFF' },
      { color: 'gray', hex: '#808080' },
      { color: 'brown', hex: '#A52A2A' },
      { color: 'pink', hex: '#FFC0CB' },
      { color: 'cyan', hex: '#00FFFF' },
      { color: 'magenta', hex: '#FF00FF' },
      { color: 'lime', hex: '#00FF00' },
      { color: 'navy', hex: '#000080' },
      { color: 'maroon', hex: '#800000' },
      { color: 'olive', hex: '#808000' },
      { color: 'teal', hex: '#008080' },
      { color: 'silver', hex: '#C0C0C0' },
    ];

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task to initialize repos
    await task({ adapter: mockAdapter });

    // Get the normalize function
    const normalizeFunc = mockAdapter.initializeRepos.mock.calls[0][0][1].normalize;

    for (const test of colorTests) {
      const normalizedLabel = normalizeFunc({
        id: '68e8befb',
        name: 'Test',
        color: test.color,
      });

      expect(normalizedLabel.data.color).toBe(test.hex);
    }
  });

  it('should use default hex code for unknown colors', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;

    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task to initialize repos
    await task({ adapter: mockAdapter });

    // Get the normalize function
    const normalizeFunc = mockAdapter.initializeRepos.mock.calls[0][0][1].normalize;

    const normalizedLabel = normalizeFunc({
      id: '68e8befb',
      name: 'Test',
      color: 'unknown-color',
    });

    expect(normalizedLabel.data.color).toBe('#000000');
  });

  it('should normalize comments correctly', async () => {
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.cards.completed = false;

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    const mockCards = [
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
    ];

    const mockComments = [
      {
        id: '6903676ae620c67577973190',
        idMemberCreator: '6752eb529b14a3446b75e69c',
        data: {
          idCard: '507f1f77bcf86cd799439011',
          text: 'Test comment\nSecond line',
          board: {
            id: 'test-board-id',
          },
          dateLastEdited: '2023-01-02T00:00:00.000Z',
        },
        memberCreator: {
          username: 'johndoe',
        },
        date: '2023-01-01T00:00:00.000Z',
      },
    ];

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: [{ idMemberCreator: '6752eb52' }],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task to initialize repos
    await task({ adapter: mockAdapter });

    // Get the normalize function for comments
    const normalizeFunc = mockAdapter.initializeRepos.mock.calls[0][0][3].normalize;
    const normalizedComment = normalizeFunc(mockComments[0]);

    expect(normalizedComment).toMatchObject({
      id: '6903676ae620c67577973190',
      created_date: expect.any(String),
      modified_date: '2023-01-02T00:00:00.000Z',
      data: {
        id: '6903676ae620c67577973190',
        body: ['Test comment', 'Second line'],
        parent_object_id: '507f1f77bcf86cd799439011',
        created_by_id: '6752eb529b14a3446b75e69c',
        modified_date: '2023-01-02T00:00:00.000Z',
        grandparent_object_id: 'test-board-id',
        grandparent_object_type: 'board',
        creator_display_name: 'johndoe',
        parent_object_type: 'issue',
      },
    });
  });

  // New tests for incremental mode
  it('should reset state for cards, comments, and attachments in incremental mode', async () => {
    mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.cards.completed = true;
    mockAdapter.state.comments.completed = true;
    mockAdapter.state.attachments.completed = true;

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: [],
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify state was reset for cards, comments, and attachments
    expect(mockAdapter.state.cards.completed).toBe(true);
    expect(mockAdapter.state.comments.completed).toBe(true);
    expect(mockAdapter.state.attachments.completed).toBe(true);

    // Verify modifiedSince was set
    expect(mockAdapter.state.cards.modifiedSince).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should filter cards by dateLastActivity in incremental mode', async () => {
    mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.lastSuccessfulSyncStarted = '2023-06-01T00:00:00.000Z';

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    const mockCards = [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'Old Card',
        desc: '',
        due: null,
        idList: 'list1',
        url: 'https://trello.com/c/card1',
        idMembers: [],
        idLabels: [],
        dueComplete: false,
        pos: 1,
        closed: false,
        dateLastActivity: '2023-05-01T00:00:00.000Z', // Before lastSuccessfulSyncStarted
        subscribed: false,
        cover: null,
        badges: {},
        start: null,
      },
      {
        id: '507f1f77bcf86cd799439012',
        name: 'New Card',
        desc: '',
        due: null,
        idList: 'list1',
        url: 'https://trello.com/c/card2',
        idMembers: [],
        idLabels: [],
        dueComplete: false,
        pos: 2,
        closed: false,
        dateLastActivity: '2023-07-01T00:00:00.000Z', // After lastSuccessfulSyncStarted
        subscribed: false,
        cover: null,
        badges: {},
        start: null,
      },
    ];

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: [{ idMemberCreator: '6752eb52' }],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify only the new card was processed
    const cardsRepo = mockAdapter.getRepo('cards');
    expect(cardsRepo.push).toHaveBeenCalledTimes(1);

    // Verify getCardCreateAction was called only once (for the new card)
    expect(__mockGetCardCreateAction).toHaveBeenCalledTimes(1);
    expect(__mockGetCardCreateAction).toHaveBeenCalledWith('507f1f77bcf86cd799439012');
  });

  it('should not filter cards when not in incremental mode', async () => {
    mockAdapter.event.payload.event_context.mode = 'INITIAL';
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    const mockCards = [
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
      {
        id: '507f1f77bcf86cd799439012',
        name: 'Card 2',
        desc: '',
        due: null,
        idList: 'list1',
        url: 'https://trello.com/c/card2',
        idMembers: [],
        idLabels: [],
        dueComplete: false,
        pos: 2,
        closed: false,
        dateLastActivity: '2023-07-01T00:00:00.000Z',
        subscribed: false,
        cover: null,
        badges: {},
        start: null,
      },
    ];

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    __mockGetCardCreateAction.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: [{ idMemberCreator: '6752eb52' }],
    });

    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: [],
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify both cards were processed
    expect(__mockGetCardCreateAction).toHaveBeenCalledTimes(2);
  });

  it('should skip batch if no cards match filter in incremental mode', async () => {
    mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
    mockAdapter.state.users.completed = true;
    mockAdapter.state.labels.completed = true;
    mockAdapter.state.lastSuccessfulSyncStarted = '2023-06-01T00:00:00.000Z';

    const mockLists = [
      {
        id: 'list1',
        name: 'To Do',
      },
    ];

    // All cards are older than lastSuccessfulSyncStarted
    const mockCards = [
      {
        id: '507f1f77bcf86cd799439011',
        name: 'Old Card 1',
        desc: '',
        due: null,
        idList: 'list1',
        url: 'https://trello.com/c/card1',
        idMembers: [],
        idLabels: [],
        dueComplete: false,
        pos: 1,
        closed: false,
        dateLastActivity: '2023-05-01T00:00:00.000Z',
        subscribed: false,
        cover: null,
        badges: {},
        start: null,
      },
    ];

    __mockGetLists.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: mockLists,
    });

    __mockGetCards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: mockCards,
    });

    // Load the worker to register the task
    require('./data-extraction');

    // Get the registered task
    const task = (global as any).__testTask;

    // Execute the task
    await task({ adapter: mockAdapter });

    // Verify no cards were processed
    const cardsRepo = mockAdapter.getRepo('cards');
    expect(cardsRepo.push).not.toHaveBeenCalled();

    // Verify getCardCreateAction was not called
    expect(__mockGetCardCreateAction).not.toHaveBeenCalled();
  });
});