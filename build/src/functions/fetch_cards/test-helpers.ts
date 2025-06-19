import axios from 'axios';
import { createMockEvent } from './test-utils';

/**
 * Sets up the test environment with mocks and spies
 * 
 * @returns Object containing test utilities and cleanup function
 */
export function setupTest() {
  // Spy on axios get method
  const axiosGetSpy = jest.spyOn(axios, 'get');
  
  // Function to clean up after tests
  const cleanup = () => {
    axiosGetSpy.mockRestore();
  };
  
  return {
    axiosGetSpy,
    cleanup,
    createTestEvent: createMockEvent,
    mockSuccessfulResponse: (cards: any[]) => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: cards
      });
    },
    mockEmptyResponse: () => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: []
      });
    },
    mockFailedResponse: (status: number, statusText: string, data: any) => {
      (axios.get as jest.Mock).mockRejectedValueOnce({
        response: {
          status,
          statusText,
          data
        }
      });
    },
    mockNetworkError: (message: string = 'Network Error') => {
      (axios.get as jest.Mock).mockRejectedValueOnce({
        request: {},
        message
      });
    }
  };
}

/**
 * Creates mock card data for testing
 * 
 * @returns Array of mock Trello cards
 */
export function createMockCards() {
  return [
    {
      id: 'card1',
      name: 'Test Card 1',
      desc: 'Description for card 1',
      closed: false,
      idList: 'list1',
      idBoard: 'board1',
      url: 'https://trello.com/c/card1',
      shortUrl: 'https://trello.com/c/sh1',
      due: '2023-12-31T23:59:59.000Z',
      dueComplete: false,
      labels: [
        { id: 'label1', name: 'Label 1', color: 'green' }
      ],
      idMembers: ['member1', 'member2']
    },
    {
      id: 'card2',
      name: 'Test Card 2',
      desc: 'Description for card 2',
      closed: true,
      idList: 'list2',
      idBoard: 'board1',
      url: 'https://trello.com/c/card2',
      shortUrl: 'https://trello.com/c/sh2',
      due: null,
      dueComplete: false,
      labels: [],
      idMembers: []
    }
  ];
}

/**
 * Creates the expected transformed cards output
 * 
 * @param mockCards - The mock cards to transform
 * @returns Transformed cards in the expected output format
 */
export function createExpectedCards(mockCards: any[]) {
  return mockCards.map(card => ({
    id: card.id,
    name: card.name,
    description: card.desc,
    is_closed: card.closed,
    list_id: card.idList,
    board_id: card.idBoard,
    url: card.url,
    short_url: card.shortUrl,
    due_date: card.due,
    is_due_complete: card.dueComplete,
    labels: card.labels ? card.labels.map((label: any) => ({
      id: label.id,
      name: label.name,
      color: label.color
    })) : [],
    member_ids: card.idMembers || []
  }));
}