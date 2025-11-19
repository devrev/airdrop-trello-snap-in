import axios, { AxiosInstance } from 'axios';

/**
 * HTTP client for making test requests
 */
export class TestHttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send POST request
   */
  async post(url: string, data: any): Promise<any> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  /**
   * Send GET request
   */
  async get(url: string): Promise<any> {
    const response = await this.client.get(url);
    return response.data;
  }
}