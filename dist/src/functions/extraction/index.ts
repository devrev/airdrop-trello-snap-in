import { convertToAirdropEvent } from '../../core/utils';
import { FunctionInput } from '../../core/types';
import { spawn, EventType } from '@devrev/ts-adaas';
import initialDomainMapping from '../../core/initial-domain-mapping.json';

function getWorkerPerExtractionPhase(event: FunctionInput) {
  let path;
  switch (event.payload.event_type) {
    case EventType.ExtractionExternalSyncUnitsStart:
      path = __dirname + '/workers/external-sync-units-extraction.ts';
      break;
    case EventType.ExtractionMetadataStart:
      path = __dirname + '/workers/metadata-extraction.ts';
      break;
    case EventType.ExtractionDataStart:
    case EventType.ExtractionDataContinue:
      path = __dirname + '/workers/data-extraction.ts';
      break;
    case EventType.ExtractionAttachmentsStart:
    case EventType.ExtractionAttachmentsContinue:
      path = __dirname + '/workers/attachments-extraction.ts';
      break;
  }
  return path;
}

// Initial extraction state object
const initialExtractionState = {
  users: { completed: false },
  cards: { completed: false, before: undefined, modifiedSince: undefined },
  attachments: { completed: false },
};

const run = async (events: FunctionInput[]) => {
  for (const event of events) {
    const file = getWorkerPerExtractionPhase(event);
    await spawn({
      event: convertToAirdropEvent(event),
      workerPath: file,
      initialState: initialExtractionState,
      initialDomainMapping,
    });
  }
};

export default run;
