import { AxiosInstance } from 'axios';
import { handleTrelloError } from './trello-error-handler';
import { TrelloApiResponse, TrelloCredentials } from './trello-client';
import { generateOAuthSignature, buildOAuthParams, buildAuthorizationHeader } from './trello-oauth';

/**
 * Get all boards for an organization
 */
export async function getBoards(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  organizationId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(`/organizations/${organizationId}/boards`, {
      params: {
        key: credentials.apiKey,
        token: credentials.token,
      },
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched boards',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching boards');
  }
}

/**
 * Get all members of an organization with specific fields
 */
export async function getOrganizationMembers(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  organizationId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(
      `/organizations/${organizationId}/members`,
      {
        params: {
          key: credentials.apiKey,
          token: credentials.token,
          fields: 'fullName,avatarHash,username',
        },
      }
    );

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched organization members',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching organization members');
  }
}

/**
 * Get detailed information about a member
 */
export async function getMemberDetails(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  memberId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(`/members/${memberId}`, {
      params: {
        key: credentials.apiKey,
        token: credentials.token,
      },
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched member details',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching member details');
  }
}

/**
 * Get all labels on a board
 */
export async function getLabels(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  boardId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(`/boards/${boardId}/labels`, {
      params: {
        key: credentials.apiKey,
        token: credentials.token,
      },
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching labels');
  }
}

/**
 * Get all comments on a card
 */
export async function getComments(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  cardId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(`/cards/${cardId}/actions`, {
      params: {
        key: credentials.apiKey,
        token: credentials.token,
        filter: 'commentCard',
      },
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching comments');
  }
}

/**
 * Get all cards on a board with pagination support
 */
export async function getCards(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  boardId: string,
  limit?: number,
  before?: string
): Promise<TrelloApiResponse> {
  try {
    const params: any = {
      key: credentials.apiKey,
      token: credentials.token,
      attachments: 'true',
    };

    if (limit !== undefined) {
      params.limit = limit;
    }

    if (before) {
      params.before = before;
    }

    const response = await client.get(`/boards/${boardId}/cards`, {
      params,
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched cards',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching cards');
  }
}

/**
 * Get all lists on a board
 */
export async function getLists(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  boardId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(`/boards/${boardId}/lists`, {
      params: {
        key: credentials.apiKey,
        token: credentials.token,
      },
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched lists',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching lists');
  }
}

/**
 * Get the createCard action for a card
 */
export async function getCardCreateAction(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  cardId: string
): Promise<TrelloApiResponse> {
  try {
    const response = await client.get(`/cards/${cardId}/actions`, {
      params: {
        key: credentials.apiKey,
        token: credentials.token,
        filter: 'createCard',
      },
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully fetched card create action',
      data: response.data,
    };
  } catch (error) {
    return handleTrelloError(error, 'fetching card create action');
  }
}

/**
 * Download an attachment file with OAuth 1.0a authentication
 */
export async function downloadAttachment(
  client: AxiosInstance,
  credentials: TrelloCredentials,
  cardId: string,
  attachmentId: string,
  fileName: string
): Promise<TrelloApiResponse> {
  try {
    const url = `https://api.trello.com/1/cards/${cardId}/attachments/${attachmentId}/download/${fileName}`;

    // Build OAuth 1.0a parameters
    const oauthParams = buildOAuthParams(credentials.apiKey, credentials.token);

    // Generate signature
    const signature = generateOAuthSignature('GET', url, oauthParams, credentials.apiKey);
    oauthParams.oauth_signature = signature;

    // Build Authorization header
    const authHeader = buildAuthorizationHeader(oauthParams);

    const response = await client.get(url, {
      headers: {
        Authorization: authHeader,
        'Accept-Encoding': 'identity',
      },
      responseType: 'stream',
    });

    return {
      status_code: response.status,
      api_delay: 0,
      message: 'Successfully downloaded attachment',
      data: response,
    };
  } catch (error) {
    return handleTrelloError(error, 'downloading attachment');
  }
}