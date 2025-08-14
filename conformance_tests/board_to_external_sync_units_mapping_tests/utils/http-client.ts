import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface HttpClientOptions {
  baseURL: string;
}

export class HttpClient {
  private client: AxiosInstance;

  constructor(options: HttpClientOptions) {
    this.client = axios.create({
      baseURL: options.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async post<T = any>(path: string, data: any, config?: any): Promise<AxiosResponse<T>> {
    try {
      return await this.client.post<T>(path, data, config);
    } catch (error) {
      console.error('HTTP request failed:', error);
      throw error;
    }
    
  }
}

export const snapInClient = new HttpClient({
  baseURL: 'http://localhost:8000',
});