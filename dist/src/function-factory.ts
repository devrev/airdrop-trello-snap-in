import extraction from './functions/extraction';
import fetch_boards from './functions/fetch_boards';
import fetch_cards from './functions/fetch_cards';
import fetch_comments from './functions/fetch_comments';
import fetch_labels from './functions/fetch_labels';
import fetch_users from './functions/fetch_users';
import health_check from './functions/health_check';

export const functionFactory = {
  // Add your functions here
  extraction,
  fetch_boards,
  fetch_cards,
  fetch_comments,
  fetch_labels,
  fetch_users,
  health_check,
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
