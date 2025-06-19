import { handler as canInvoke } from './functions/can_invoke';
import { handler as canExtract } from './functions/can_extract';
import { handler as canPushData } from './functions/can_push_data';
import { handler as extractionExternalSyncUnitCheck } from './functions/extraction_external_sync_unit_check';
import { handler as dataExtractionCheck } from './functions/data_extraction_check';
import { handler as checkAuth } from './functions/check_auth';
import { handler as fetchBoards } from './functions/fetch_boards';
import { handler as fetchCards } from './functions/fetch_cards';
import { handler as fetchUsers } from './functions/fetch_users';
import { handler as pushBoardsAsSyncUnits } from './functions/push_boards_as_sync_units';
import { handler as generateDomainMetadata } from './functions/generate_domain_metadata';
import { handler as extractionMetadata } from './functions/extraction_metadata';
import { handler as extractionUsers } from './functions/extraction_users';
import { handler as extractionCards } from './functions/extraction_cards';
import { handler as extraction } from './functions/extraction';
import { handler as extractionAttachments } from './functions/extraction_attachments';

export const functionFactory = {
  // Add your functions here
  can_invoke: canInvoke,
  can_extract: canExtract,
  can_push_data: canPushData,
  extraction_external_sync_unit_check: extractionExternalSyncUnitCheck,
  data_extraction_check: dataExtractionCheck,
  check_auth: checkAuth,
  fetch_boards: fetchBoards,
  fetch_cards: fetchCards,
  fetch_users: fetchUsers,
  push_boards_as_sync_units: pushBoardsAsSyncUnits,
  generate_domain_metadata: generateDomainMetadata,
  extraction_metadata: extractionMetadata,
  extraction_users: extractionUsers,
  extraction_cards: extractionCards,
  extraction: extraction,
  extraction_attachments: extractionAttachments,
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
