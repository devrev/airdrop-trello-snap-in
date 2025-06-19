import axios from 'axios';
import { EventType } from '@devrev/ts-adaas';
import { createMockEvent, createMockPayload } from './test-utils';

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
    mockSuccessfulResponse: (users: any[]) => {
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: users
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
 * Creates mock user data for testing
 * 
 * @returns Array of mock Trello users
 */
export function createMockUsers() {
  return [
    {
      id: 'user1',
      username: 'testuser1',
      fullName: 'Test User 1',
      initials: 'TU1',
      email: 'testuser1@example.com',
      avatarUrl: 'https://trello.com/avatars/user1.png',
      bio: 'Bio for user 1',
      url: 'https://trello.com/testuser1'
    },
    {
      id: 'user2',
      username: 'testuser2',
      fullName: 'Test User 2',
      initials: 'TU2',
      email: 'testuser2@example.com',
      avatarUrl: 'https://trello.com/avatars/user2.png',
      bio: 'Bio for user 2',
      url: 'https://trello.com/testuser2'
    }
  ];
}

/**
 * Creates the expected transformed users output
 * 
 * @param mockUsers - The mock users to transform
 * @returns Transformed users in the expected output format
 */
export function createExpectedUsers(mockUsers: any[]) {
  return mockUsers.map(user => ({
    id: user.id,
    username: user.username,
    full_name: user.fullName,
    initials: user.initials,
    email: user.email,
    avatar_url: user.avatarUrl,
    bio: user.bio,
    url: user.url
  }));
}