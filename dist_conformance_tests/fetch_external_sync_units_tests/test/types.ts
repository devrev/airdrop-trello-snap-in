/**
 * Type definitions for test events and payloads
 */

export interface TestEventPayload {
  payload: {
    connection_data: {
      org_id: string;
      org_name: string;
      key: string;
      key_type: string;
    };
    event_context: {
      callback_url: string;
      dev_org: string;
      dev_org_id: string;
      dev_user: string;
      dev_user_id: string;
      external_sync_unit: string;
      external_sync_unit_id: string;
      external_sync_unit_name: string;
      external_system: string;
      external_system_type: string;
      import_slug: string;
      mode: string;
      request_id: string;
      snap_in_slug: string;
      snap_in_version_id: string;
      sync_run: string;
      sync_run_id: string;
      sync_tier: string;
      sync_unit: string;
      sync_unit_id: string;
      uuid: string;
      worker_data_url: string;
    };
    event_type: string;
    event_data?: any;
  };
  context: {
    secrets: {
      service_account_token: string;
    };
    snap_in_version_id: string;
    dev_oid: string;
    source_id: string;
    snap_in_id: string;
    service_account_id: string;
  };
  execution_metadata: {
    request_id: string;
    function_name: string;
    event_type: string;
    devrev_endpoint: string;
  };
  input_data: {
    global_values: Record<string, string>;
    event_sources: Record<string, string>;
  };
}

export interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_type?: string;
  item_count?: number;
}