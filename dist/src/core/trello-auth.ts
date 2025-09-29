import crypto from 'crypto';

export interface TrelloCredentials {
  apiKey: string;
  token: string;
}

export class TrelloAuth {
  private apiKey: string;
  private token: string;

  constructor(credentials: TrelloCredentials) {
    this.apiKey = credentials.apiKey;
    this.token = credentials.token;
  }

  /**
   * Generate OAuth 1.0a authorization header
   * This is a simplified implementation for the download endpoint
   */
  generateOAuthHeader(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const oauthParams = {
      oauth_consumer_key: this.apiKey,
      oauth_token: this.token,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
    };

    // For this simplified implementation, we'll create a basic signature
    // In a production environment, you would need the consumer secret and token secret
    // to properly sign the request according to OAuth 1.0a specification
    const signature = this.generateOAuthSignature(oauthParams);
    
    const authParams = Object.entries({
      ...oauthParams,
      oauth_signature: signature,
    })
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ');

    return `OAuth ${authParams}`;
  }

  private generateOAuthSignature(params: Record<string, string>): string {
    // Simplified signature generation - in production this would be properly implemented
    return crypto.createHash('sha1').update(JSON.stringify(params)).digest('base64');
  }

  /**
   * Parse API key and token from connection data key field
   */
  static parseCredentials(connectionKey: string): TrelloCredentials {
    const params = new URLSearchParams(connectionKey);
    const apiKey = params.get('key');
    const token = params.get('token');

    if (!apiKey || !token) {
      throw new Error('Invalid connection data: missing API key or token');
    }

    return { apiKey, token };
  }
}