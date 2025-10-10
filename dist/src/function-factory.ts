import { run as checkAuthentication } from './functions/check_authentication';
import { run as checkInvocation } from './functions/check_invocation';
import { run as dataExtractionCheck } from './functions/data_extraction_check';
import { run as downloadAttachment } from './functions/download_attachment';
import { run as extraction } from './functions/extraction';
import { run as fetchBoards } from './functions/fetch_boards';
import { run as fetchBoardCards } from './functions/fetch_board_cards';
import { run as fetchOrganizationMembers } from './functions/fetch_organization_members';
import { run as getExternalDomainMetadata } from './functions/get_external_domain_metadata';
import { run as getInitialDomainMapping } from './functions/get_initial_domain_mapping';
import { run as testExternalSyncUnits } from './functions/test_external_sync_units';

export const functionFactory = {
  // Function to check if it can be invoked
  check_authentication: checkAuthentication,
  check_invocation: checkInvocation,
  data_extraction_check: dataExtractionCheck,
  download_attachment: downloadAttachment,
  extraction: extraction,
  fetch_board_cards: fetchBoardCards,
  fetch_boards: fetchBoards,
  fetch_organization_members: fetchOrganizationMembers,
  get_external_domain_metadata: getExternalDomainMetadata,
  get_initial_domain_mapping: getInitialDomainMapping,
  test_external_sync_units: testExternalSyncUnits
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
