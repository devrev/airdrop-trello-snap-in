import extraction from './functions/extraction';
import healthCheck from './functions/health-check';
import testExternalSyncUnits from './functions/test_external_sync_units';
import dataExtractionCheck from './functions/data_extraction_check';
import checkAuthentication from './functions/check_authentication';
import fetchBoards from './functions/fetch_boards';
import fetchOrganizationMembers from './functions/fetch_organization_members';
import fetchBoardCards from './functions/fetch_board_cards';
import downloadAttachment from './functions/download_attachment';
import fetchCreatedBy from './functions/fetch_created_by';
import getExternalDomainMetadata from './functions/get_external_domain_metadata';
import getInitialDomainMapping from './functions/get_initial_domain_mapping';

export const functionFactory = {
  // Add your functions here
  extraction,
  'health-check': healthCheck,
  'test_external_sync_units': testExternalSyncUnits,
  'data_extraction_check': dataExtractionCheck,
  'check_authentication': checkAuthentication,
  'fetch_boards': fetchBoards,
  'fetch_organization_members': fetchOrganizationMembers,
  'fetch_board_cards': fetchBoardCards,
  'download_attachment': downloadAttachment,
  'fetch_created_by': fetchCreatedBy,
  'get_external_domain_metadata': getExternalDomainMetadata,
  'get_initial_domain_mapping': getInitialDomainMapping,
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
