import { health_check } from './functions/health_check';
import { test_external_sync_units } from './functions/test_external_sync_units';
import { data_extraction_check } from './functions/data_extraction_check';
import { auth_check } from './functions/auth_check';
import { get_boards } from './functions/get_boards';
import { get_organization_members } from './functions/get_organization_members';
import { fetch_board_cards } from './functions/fetch_board_cards';
import { fetch_card_attachments } from './functions/fetch_card_attachments';
import { get_external_domain_metadata } from './functions/get_external_domain_metadata';
import { get_initial_domain_mapping } from './functions/get_initial_domain_mapping';
import { extraction } from './functions/extraction';

export const functionFactory = {
  // Add your functions here
  health_check,
  test_external_sync_units,
  data_extraction_check,
  auth_check,
  get_boards,
  get_organization_members,
  fetch_board_cards,
  fetch_card_attachments,
  get_external_domain_metadata,
  get_initial_domain_mapping,
  extraction
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
