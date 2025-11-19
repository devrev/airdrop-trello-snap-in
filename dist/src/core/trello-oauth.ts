import * as crypto from 'crypto';

export interface OAuthParams {
  [key: string]: string | undefined;
  oauth_consumer_key: string;
  oauth_token: string;
  oauth_signature_method: string;
  oauth_timestamp: string;
  oauth_nonce: string;
  oauth_version: string;
  oauth_signature?: string;
}

/**
 * Generate OAuth 1.0a signature for Trello API
 */
export function generateOAuthSignature(
  method: string,
  url: string,
  params: OAuthParams,
  apiKey: string
): string {
  // Filter out undefined values
  const definedParams: Record<string, string> = Object.keys(params).reduce((acc, key) => {
    if (params[key] !== undefined) {
      acc[key] = params[key] as string;
    }
    return acc;
  }, {} as Record<string, string>);

  // Sort parameters
  const sortedParams = Object.keys(definedParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(definedParams[key])}`)
    .join('&');

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Create signing key (token secret is empty for Trello)
  const signingKey = `${encodeURIComponent(apiKey)}&`;

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

/**
 * Build OAuth 1.0a parameters for Trello API request
 */
export function buildOAuthParams(apiKey: string, token: string): OAuthParams {
  return {
    oauth_consumer_key: apiKey,
    oauth_token: token,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
  };
}

/**
 * Build OAuth Authorization header from parameters
 */
export function buildAuthorizationHeader(oauthParams: OAuthParams): string {
  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .map((key) => `${key}="${encodeURIComponent(oauthParams[key] as string)}"`)
      .join(', ')
  );
}