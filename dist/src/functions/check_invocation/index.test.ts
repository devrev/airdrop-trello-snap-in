import { run } from './index';
import { FunctionInput } from '../../core/types';

describe('check_invocation function', () => {
  const mockEvent: FunctionInput = {
    payload: {},
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'check_invocation',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  it('should return that the function can be invoked when given valid events', async () => {
    const result = await run([mockEvent]);
    
    expect(result).toEqual({
      can_be_invoked: true,
      message: 'Function can be invoked successfully'
    });
  });

  it('should return an error when no events are provided', async () => {
    const result = await run([]);
    
    expect(result).toEqual({
      can_be_invoked: false,
      message: 'Function invocation check failed: No events provided'
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);
    
    expect(result).toEqual({
      can_be_invoked: false,
      message: 'Function invocation check failed: No events provided'
    });
  });
});