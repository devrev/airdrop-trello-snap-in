import { EventType, ExtractorEventType } from './types';

// Helper function to wait for a specified time
export function waitForTimeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createExtractionEvent(eventType: string, callbackUrl: string) {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;
  
  if (!apiKey || !token || !orgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    payload: {
      event_type: eventType,
      connection_data: {
        key: `key=${apiKey}&token=${token}`,
        org_id: orgId,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: callbackUrl,
        dev_org: 'dev_org_123',
        dev_org_id: 'dev_org_123',
        dev_user: 'dev_user_123',
        dev_user_id: 'dev_user_123',
        external_sync_unit: 'external_sync_unit_123',
        external_sync_unit_id: '6752eb95c833e6b206fcf388',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'req_123',
        snap_in_slug: 'trello-airdrop',
        snap_in_version_id: 'snap_ver_123',
        sync_run: 'sync_run_123',
        sync_run_id: 'sync_run_123',
        sync_tier: 'tier_1',
        sync_unit: 'sync_unit_123',
        sync_unit_id: 'sync_unit_123',
        uuid: 'uuid_123',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    },
    context: {
      dev_oid: 'dev_org_123',
      source_id: 'source_123',
      snap_in_id: 'snap_in_123',
      snap_in_version_id: 'snap_ver_123',
      service_account_id: 'service_acc_123',
      secrets: {
        service_account_token: 'service_token_123'
      }
    },
    execution_metadata: {
      request_id: 'req_123',
      function_name: 'extraction',
      event_type: 'event_type_123',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}