import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface SetupOptions {
  endpoint: string;
  headers?: Record<string, string>;
}

export class HttpClient {
  public instance: AxiosInstance;

  constructor({ endpoint, headers = {} }: SetupOptions) {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: endpoint,
      headers,
    };

    this.instance = axios.create(axiosConfig);
  }

  async post<T = any>(path: string, body: unknown): Promise<AxiosResponse<T>> {
    return this.instance.request({
      method: 'POST',
      data: body,
      url: path,
    });
  }
}