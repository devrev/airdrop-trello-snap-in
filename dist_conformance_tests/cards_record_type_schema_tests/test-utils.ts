import axios from 'axios';
import { spawn } from 'child_process';
import { createServer, Server } from 'http';

export interface TestCredentials {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
  chefCliPath: string;
}

export function getTestCredentials(): TestCredentials {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID;
  const chefCliPath = process.env.CHEF_CLI_PATH;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!trelloOrganizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }
  if (!chefCliPath) {
    throw new Error('CHEF_CLI_PATH environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId,
    chefCliPath,
  };
}

export function createTestEvent(credentials: TestCredentials, functionName: string, additionalData: any = {}): any {
  return {
    payload: {
      connection_data: {
        key: `key=${credentials.trelloApiKey}&token=${credentials.trelloToken}`,
        org_id: credentials.trelloOrganizationId,
        org_name: 'Test Organization',
        key_type: 'oauth',
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-org',
        dev_org_id: 'test-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: '68e8befbf2f641caa9b1e275',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'test-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker',
        ...additionalData.event_context,
      },
      event_type: additionalData.event_type || 'test_event',
      event_data: additionalData.event_data || {},
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: additionalData.global_values || {},
      event_sources: {},
    },
  };
}

export async function setupCallbackServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'received' }));
    });

    server.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({ server, port: 8002 });
      }
    });
  });
}

export async function callSnapInFunction(functionName: string, event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return response.data;
}

export async function validateWithChefCli(metadata: any, chefCliPath: string): Promise<{ success: boolean; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(chefCliPath, ['validate-metadata'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      console.log('Chef CLI stdout:', stdout);
      console.log('Chef CLI stderr:', stderr);
      resolve({
        success: code === 0 && stdout.trim() === '',
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      console.error('Chef CLI error:', error);
      resolve({
        success: false,
        stdout: '',
        stderr: error.message,
      });
    });

    // Send metadata to stdin
    child.stdin.write(JSON.stringify(metadata));
    child.stdin.end();
  });
}