/**
 * Type definitions for the extraction function state
 */

export interface ExtractorState {
  users: {
    completed: boolean;
  };
  cards: {
    completed: boolean;
    before?: string;
    modifiedSince?: string;
  };
  attachments: {
    completed: boolean;
  };
}