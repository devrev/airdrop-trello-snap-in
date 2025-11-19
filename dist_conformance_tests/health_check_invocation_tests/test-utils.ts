import express, { Express } from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import axios, { AxiosResponse } from 'axios';

/**
 * Sets up a callback server for testing
 */
export function setupCallbackServer(port: number): Promise<{ app: Express; server: Server }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());

    const server = app.listen(port, () => {
      console.log(`[test-callback-server]: Running at http://localhost:${port}`);
      resolve({ app, server });
    });
  });
}

/**
 * Closes the callback server
 */
export function closeCallbackServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Sends a synchronous request to the snap-in server
 */
export async function sendSyncRequest(payload: any): Promise<AxiosResponse> {
  const snapInServerUrl = 'http://localhost:8000/handle/sync';
  return axios.post(snapInServerUrl, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Don't throw on any status code
  });
}

/**
 * Creates a base event payload for testing
 */
export function createBaseEventPayload(functionName: string, requestId: string): any {
  return {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: 'test-key',
        key_type: 'test-key-type',
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: 'test-sync-unit-id',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'test-system',
        external_system_type: 'test-system-type',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: requestId,
        snap_in_slug: 'test-snap-in-slug',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-sync-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      event_type: 'test-event-type',
      event_data: {},
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-service-account-token',
      },
    },
    execution_metadata: {
      request_id: requestId,
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}