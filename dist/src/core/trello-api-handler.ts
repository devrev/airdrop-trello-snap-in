import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { TrelloApiResponse } from './trello-types';

/**
 * Base class for handling Trello API requests and responses.
 * Manages HTTP communication, error handling, and response processing.
 */
export class TrelloApiHandler {
  protected axiosInstance: AxiosInstance;
  protected apiKey: string;
  protected token: string;

  constructor(apiKey: string, token: string, baseUrl: string = 'https://api.trello.com/1') {
    this.apiKey = apiKey;
    this.token = token;

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include API key and token
    this.axiosInstance.interceptors.request.use((config) => {
      config.params = {
        ...config.params,
        key: this.apiKey,
        token: this.token,
      };
      return config;
    });
  }

  /**
   * Handles API errors and converts them to standardized response format.
   */
  protected handleApiError(error: unknown, defaultMessage: string): TrelloApiResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const retryAfter = axiosError.response?.headers?.['retry-after'];
      
      // Calculate API delay based on rate limiting
      let apiDelay = 0;
      if (status === 429 && retryAfter) {
        // Parse Retry-After header (can be in seconds or HTTP date format)
        if (/^\d+$/.test(retryAfter)) {
          apiDelay = parseInt(retryAfter, 10);
        } else {
          // HTTP date format - calculate seconds until that time
          const retryDate = new Date(retryAfter);
          const now = new Date();
          apiDelay = Math.max(0, Math.ceil((retryDate.getTime() - now.getTime()) / 1000));
        }
      }

      let message = defaultMessage;
      if (status === 401) {
        message = 'Authentication failed - invalid API key or token';
      } else if (status === 403) {
        message = 'Access forbidden - insufficient permissions';
      } else if (status === 429) {
        message = `Rate limit exceeded - retry after ${apiDelay} seconds`;
      } else if (status >= 500) {
        message = 'Trello API server error';
      } else if (axiosError.response?.data) {
        // Try to extract error message from response
        const responseData = axiosError.response.data as any;
        if (typeof responseData === 'string') {
          message = responseData;
        } else if (responseData.message) {
          message = responseData.message;
        } else if (responseData.error) {
          message = responseData.error;
        }
      }

      return {
        status_code: status,
        api_delay: apiDelay,
        message: message,
      };
    }

    // Handle non-Axios errors
    return {
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : defaultMessage,
    };
  }

  /**
   * Makes a GET request to the Trello API and handles the response.
   */
  protected async makeGetRequest<T>(
    endpoint: string, 
    params: any = {}, 
    defaultErrorMessage: string = 'API request failed'
  ): Promise<TrelloApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params });
      
      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Request successful',
      };
    } catch (error) {
      return this.handleApiError(error, defaultErrorMessage);
    }
  }

  /**
   * Makes a GET request for binary data (like file downloads) and handles the response.
   */
  protected async makeBinaryGetRequest(
    endpoint: string,
    headers: any = {},
    defaultErrorMessage: string = 'Binary request failed'
  ): Promise<TrelloApiResponse<ArrayBuffer>> {
    try {
      const response: AxiosResponse<ArrayBuffer> = await this.axiosInstance.get(endpoint, {
        headers,
        responseType: 'arraybuffer',
        // Remove default params for OAuth endpoints
        params: {},
      });
      
      return {
        data: response.data,
        status_code: response.status,
        api_delay: 0,
        message: 'Binary request successful',
        headers: response.headers,
      };
    } catch (error) {
      return this.handleApiError(error, defaultErrorMessage);
    }
  }
}