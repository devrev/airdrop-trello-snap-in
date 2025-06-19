import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * Sets up the test environment with mocks and spies
 * 
 * @returns Object containing test utilities and cleanup function
 */
export function setupTest() {
  // Create a spy on the spawn function
  const spawnMock = jest.spyOn(require('@devrev/ts-adaas'), 'spawn').mockImplementation(() => {
    return Promise.resolve();
  });

  // Spy on the loadInitialDomainMapping function and mock its implementation
  const loadInitialDomainMappingSpy = jest.spyOn(require('../../core/domain-mapping-utils'), 'loadInitialDomainMapping')
    .mockImplementation(() => {
      return { mock: "domain-mapping" };
    });
  
  // Function to clean up after tests
  const cleanup = () => {
    spawnMock.mockRestore();
    loadInitialDomainMappingSpy.mockRestore();
  };
  
  return {
    spawnMock,
    loadInitialDomainMappingSpy,
    cleanup
  };
}

/**
 * Creates a mock payload for testing
 * 
 * @param eventType - The event type to use in the payload
 * @returns A mock payload object
 */
export function createMockPayload(eventType: EventType = EventType.ExtractionExternalSyncUnitsStart) {
  return {
    connection_data: {
      org_id: 'mock-org-id',
      org_name: 'mock-org-name',
      key: 'mock-key',
      key_type: 'mock-key-type',
    },
    event_context: {
      callback_url: 'https://mock-callback-url',
      dev_org: 'mock-dev-org',
      dev_org_id: 'mock-dev-org-id',
      dev_user: 'mock-dev-user',
      dev_user_id: 'mock-dev-user-id',
      external_sync_unit: 'mock-external-sync-unit',
      external_sync_unit_id: 'mock-external-sync-unit-id',
      external_sync_unit_name: 'mock-external-sync-unit-name',
      external_system: 'mock-external-system',
      external_system_type: 'mock-external-system-type',
      import_slug: 'mock-import-slug',
      mode: 'INITIAL',
      request_id: 'mock-request-id',
      snap_in_slug: 'mock-snap-in-slug',
      snap_in_version_id: 'mock-snap-in-version-id',
      uuid: 'mock-uuid',
      worker_data_url: 'mock-worker-data-url',
      sync_run: 'mock-sync-run' as any,
      sync_run_id: 'mock-sync-run-id',
      sync_tier: 'mock-sync-tier',
      sync_unit: 'mock-sync-unit',
      sync_unit_id: 'mock-sync-unit-id',
    },
    event_type: eventType,
  };
}

/**
 * Creates a properly structured mock AirdropEvent for testing
 * 
 * @param eventType - The event type to use in the event
 * @returns A mock AirdropEvent object
 */
export function createMockEvent(eventType: EventType = EventType.ExtractionExternalSyncUnitsStart): AirdropEvent {
  return {
    context: {
      secrets: {
        service_account_token: 'mock-token',
      },
      snap_in_version_id: 'mock-version-id',
      snap_in_id: 'mock-snap-in-id',
    } as any,
    execution_metadata: {
      devrev_endpoint: 'https://mock-endpoint.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: createMockPayload(eventType) as any,
  };
}