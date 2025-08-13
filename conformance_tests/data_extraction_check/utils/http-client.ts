import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface HttpClientOptions {
  baseURL: string;
}

export class HttpClient {
  private instance: AxiosInstance;

  constructor(options: HttpClientOptions) {
    this.instance = axios.create({
      baseURL: options.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async post<T = any>(path: string, data: any): Promise<AxiosResponse<T>> {
    return this.instance.post(path, data);
  }
}

export const snapInClient = new HttpClient({
  baseURL: 'http://localhost:8000'
});