export function createBaseEvent(overrides: Record<string, any> = {}): any {
  // Read environment variables
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  // Create base event
  const baseEvent = {
    payload: {
      connection_data: {
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        org_id: trelloOrgId,
        org_name: 'Test Organization'
      },
      event_context: {
        external_sync_unit_id: '688725dad59c015ce052eecf', // Default board ID for testing
        callback_url: 'http://localhost:8002/callback'
      }
    },
    context: {
      dev_oid: 'dev_oid_123',
      source_id: 'source_123',
      snap_in_id: 'snap_in_123',
      snap_in_version_id: 'snap_in_version_123',
      service_account_id: 'service_account_123',
      secrets: {
        service_account_token: 'service_account_token_123'
      }
    },
    execution_metadata: {
      request_id: 'request_123',
      function_name: 'fetch_board_cards',
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {
        limit: '10' // Default limit
      },
      event_sources: {}
    }
  };

  // Apply overrides
  return deepMerge(baseEvent, overrides);
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}