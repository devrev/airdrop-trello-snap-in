import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export class HttpClient {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      // Configuration to avoid open handles
      timeout: 30000,
      httpAgent: new (require('http').Agent)({ keepAlive: false }),
      httpsAgent: new (require('https').Agent)({ keepAlive: false }),
    });
  }

  async post<T = any>(path: string, data: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    if (!config) {
      config = {};
    }
    const response = await this.instance.post<T>(path, data, config);
    return response;
  }

  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const response = await this.instance.get<T>(path, config);
    return response;
  }
}

// Create client with proper configuration to avoid open handles
export const snapInClient = new HttpClient('http://localhost:8000');

// Configure axios defaults to help with cleanup
axios.defaults.timeout = 30000; 
axios.defaults.timeoutErrorMessage = 'Request timed out'; 
axios.defaults.maxRedirects = 5;
axios.defaults.httpAgent = new (require('http').Agent)({ keepAlive: false });
axios.defaults.httpsAgent = new (require('https').Agent)({ keepAlive: false });
axios.defaults.validateStatus = status => status >= 200 && status < 500; // Don't throw on 4xx errors
axios.defaults.maxRedirects = 5;