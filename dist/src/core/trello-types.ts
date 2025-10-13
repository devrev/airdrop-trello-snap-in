export interface TrelloClientConfig {
  apiKey: string;
  token: string;
  baseUrl?: string;
}

export interface TrelloApiResponse<T = any> {
  data?: T;
  status_code: number;
  api_delay: number;
  message: string;
  headers?: any;
}

export interface TrelloMember {
  id: string;
  fullName?: string;
  username?: string;
  email?: string;
  [key: string]: any;
}

export interface TrelloBoard {
  id: string;
  name: string;
  desc?: string;
  closed: boolean;
  url?: string;
  shortUrl?: string;
  dateLastActivity?: string;
  idOrganization?: string;
  [key: string]: any;
}

export interface TrelloOrganizationMember {
  id: string;
  fullName?: string;
  username?: string;
  lastActive?: string;
  [key: string]: any;
}

export interface TrelloAttachment {
  id: string;
  name?: string;
  fileName?: string;
  url?: string;
  idMember?: string;
  [key: string]: any;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  closed: boolean;
  dateLastActivity?: string;
  idMembers?: string[];
  attachments?: TrelloAttachment[];
  [key: string]: any;
}

export interface TrelloAction {
  id: string;
  idMemberCreator?: string;
  [key: string]: any;
}

export interface TrelloAttachmentDownload {
  file_data: string; // Base64 encoded file content
  file_name: string;
  content_type: string;
  file_size?: number;
}