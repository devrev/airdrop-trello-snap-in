import { health_check } from './index';
import { FunctionInput } from '../../core/types';

describe('health_check function', () => {
  // Mock function input
  const mockFunctionInput: FunctionInput = {
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
      function_name: 'health_check',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai/'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  it('should return a success message when invoked', async () => {
    // Arrange
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await health_check(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Function is operational and can be invoked successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Health check function invoked with request ID: test-request-id');
  });

  it('should throw an error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act & Assert
    await expect(health_check(events)).rejects.toThrow('No events provided to the function');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});