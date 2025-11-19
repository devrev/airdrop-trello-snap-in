/**
 * Type definitions and utilities for data extraction
 */

export interface NormalizedUser {
  id: string;
  created_date: string;
  modified_date: string;
  data: {
    id: string;
    full_name: string;
    username: string;
    email: string;
  };
}

export interface NormalizedLabel {
  id: string;
  created_date: string;
  modified_date: string;
  data: {
    id: string;
    name: string;
    color: string;
    description: string[];
  };
}

export interface NormalizedCard {
  id: string;
  created_date: string;
  modified_date: string;
  data: {
    id: string;
    title: string;
    body: string[] | null;
    target_close_date: string | null;
    stage: string;
    item_url_field: string;
    owned_by_ids: string[];
    tags: string[];
    created_by_id: string | null;
    trello_due_complete: boolean;
    trello_position: number;
    state: boolean;
    modified_date: string;
    trello_subscribed: boolean;
    trello_cover_image: string | null;
    trello_badges: string | null;
    trello_start_date: string | null;
  };
}

export interface NormalizedComment {
  id: string;
  created_date: string;
  modified_date: string;
  data: {
    id: string;
    body: string[];
    parent_object_id: string;
    created_by_id: string;
    modified_date: string;
    grandparent_object_id: string;
    grandparent_object_type: string;
    creator_display_name: string;
    parent_object_type: string;
  };
}

export interface NormalizedAttachment {
  id: string;
  url: string;
  file_name: string;
  parent_id: string;
  author_id?: string;
}

// Re-export normalizer functions for backward compatibility
export {
  normalizeUser,
  normalizeLabel,
  normalizeCard,
  normalizeComment,
  normalizeAttachment,
} from './normalization-utils';