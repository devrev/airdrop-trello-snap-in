import { TrelloClient, TrelloOrganizationMember, TrelloCard, TrelloAction } from '../../../core/trello-client';
import { EventType, SyncMode } from '@devrev/ts-adaas';
import { convertTrelloIdToCreatedDate } from './data-extraction-utils';

/**
 * Test setup utilities for data-extraction tests
 */

export interface MockExtractionState {
  users: { completed: boolean };
  cards: { completed: boolean; before?: string; modifiedSince?: string };
  attachments: { completed: boolean };
}

export const createMockTrelloClientInstance = (): jest.Mocked<TrelloClient> => {
  return {
    getOrganizationMembers: jest.fn(),
    getBoardCards: jest.fn(),
    getCardActions: jest.fn(),
  } as any;
};

export const createMockOrganizationMembers = (): TrelloOrganizationMember[] => [
  {
    id: '507f1f77bcf86cd799439011',
    fullName: 'John Doe',
    username: 'johndoe',
    lastActive: '2025-01-01T12:00:00.000Z',
  },
  {
    id: '507f1f77bcf86cd799439012',
    fullName: 'Jane Smith',
    username: 'janesmith',
    lastActive: '2024-12-31T10:00:00.000Z',
  },
];

export const createMockBoardCards = (): TrelloCard[] => [
  {
    id: '507f1f77bcf86cd799439021',
    name: 'Test Card 1',
    desc: 'Test card description\nSecond line',
    closed: false,
    dateLastActivity: '2025-01-01T12:00:00.000Z',
    url: 'https://trello.com/c/test1',
    idMembers: ['507f1f77bcf86cd799439011'],
    attachments: [
      {
        id: 'att-1',
        name: 'test-file.pdf',
        fileName: 'test-file.pdf',
        url: 'https://trello.com/1/cards/507f1f77bcf86cd799439021/attachments/att-1/download/test-file.pdf',
        idMember: '507f1f77bcf86cd799439011',
      },
    ],
  },
  {
    id: '507f1f77bcf86cd799439022',
    name: 'Test Card 2',
    desc: '',
    closed: false,
    dateLastActivity: '2024-12-31T10:00:00.000Z',
    url: 'https://trello.com/c/test2',
    idMembers: [],
    attachments: [],
  },
];

export const createMockBoardCardsForIncremental = (modifiedSince: string): TrelloCard[] => [
  {
    id: '507f1f77bcf86cd799439021',
    name: 'Old Card',
    desc: 'Card before last sync',
    closed: false,
    dateLastActivity: new Date(new Date(modifiedSince).getTime() - 3600000).toISOString(), // 1 hour before
    url: 'https://trello.com/c/old',
    idMembers: [],
    attachments: [],
  },
  {
    id: '507f1f77bcf86cd799439022',
    name: 'New Card',
    desc: 'Card after last sync',
    closed: false,
    dateLastActivity: new Date(new Date(modifiedSince).getTime() + 3600000).toISOString(), // 1 hour after
    url: 'https://trello.com/c/new',
    idMembers: [],
    attachments: [],
  },
];

export const createMockRepo = () => ({
  push: jest.fn().mockResolvedValue(true),
});

export const createMockAdapter = (overrides: any = {}) => {
  const defaultState: MockExtractionState = {
    users: { completed: false },
    cards: { completed: false, before: undefined, modifiedSince: undefined },
    attachments: { completed: false },
  };

  const stateWithOverrides = { ...defaultState, ...(overrides.state || {}) };

  const defaultAdapter = {
    state: stateWithOverrides,
    event: {
      payload: {
        event_type: EventType.ExtractionDataStart,
        event_context: {
          external_sync_unit_id: 'test-board-id',
          mode: undefined,
        },
        connection_data: {
          key: 'key=test-api-key&token=test-token',
          org_id: 'test-org-id',
        },
      },
    },
    initializeRepos: jest.fn(),
    getRepo: jest.fn(),
    emit: jest.fn().mockResolvedValue(undefined),
  };

  return { ...defaultAdapter, ...overrides };
};

export const setupMocks = () => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
};

export const createSuccessfulResponse = (data: TrelloOrganizationMember[]) => ({
  data,
  status_code: 200,
  api_delay: 0,
  message: 'Success',
});

export const createSuccessfulCardsResponse = (data: TrelloCard[]) => ({
  data,
  status_code: 200,
  api_delay: 0,
  message: 'Success',
});

export const createSuccessfulActionsResponse = (idMemberCreator: string): { data: TrelloAction[]; status_code: number; api_delay: number; message: string; } => ({
  data: [{ 
    id: 'action-123',
    idMemberCreator 
  }],
  status_code: 200,
  api_delay: 0,
  message: 'Success',
});

export const createRateLimitResponse = (delay: number = 60) => ({
  status_code: 429,
  api_delay: delay,
  message: 'Rate limit exceeded',
});

export const createErrorResponse = (statusCode: number, message: string) => ({
  status_code: statusCode,
  api_delay: 0,
  message,
});

export const createUsersWithMissingFields = () => [
  {
    id: '507f1f77bcf86cd799439013',
    username: 'user1',
    // missing fullName and lastActive
  },
  {
    id: '507f1f77bcf86cd799439014',
    fullName: 'User Two',
    // missing username and lastActive
  },
];

export const createUserWithoutLastActive = () => ({
  id: '507f1f77bcf86cd799439015',
  fullName: 'Test User',
  username: 'testuser',
  // missing lastActive
});

export const createUserWithInvalidId = () => ({
  id: 'invalid-id',
  fullName: 'Test User',
  username: 'testuser',
  lastActive: '2025-01-01T12:00:00.000Z',
});

export const expectConsoleError = (expectedMessage?: string) => {
  return jest.spyOn(console, 'error');
};