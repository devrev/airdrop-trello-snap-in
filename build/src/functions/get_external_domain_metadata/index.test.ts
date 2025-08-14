import { get_external_domain_metadata } from './index';
import { FunctionInput } from '../../core/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock the fs module
jest.mock('fs');
jest.mock('path');

describe('get_external_domain_metadata function', () => {
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
      function_name: 'get_external_domain_metadata',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai/'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  // Mock metadata content
  const mockMetadata = {
    schema_version: "v0.2.0",
    record_types: {
      users: {
        fields: {
          full_name: {
            type: "text",
            name: "Full Name",
            is_required: true
          },
          username: {
            type: "text",
            name: "Username",
            is_required: true
          }
        }
      },
      cards: {
        fields: {
          name: {
            type: "text",
            name: "Name",
            is_required: true
          },
          url: {
            type: "text",
            name: "URL",
            is_required: true
          },
          description: {
            type: "rich_text",
            name: "Description",
            is_required: true
          },
          id_members: {
            type: "reference",
            name: "ID Members",
            is_required: true,
            collection: { max_length: 50 },
            reference: { refers_to: { "#record:users": {} } }
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock path.resolve to return a fixed path
    (path.resolve as jest.Mock).mockReturnValue('/mock/path/to/external_domain_metadata.json');
    
    // Mock fs.readFileSync to return mock metadata
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockMetadata));
  });

  it('should return success with metadata when retrieval is successful', async () => {
    // Arrange
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await get_external_domain_metadata(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully retrieved external domain metadata',
      metadata: mockMetadata
    });
    expect(consoleSpy).toHaveBeenCalledWith('Get external domain metadata function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully retrieved external domain metadata');
    expect(fs.readFileSync).toHaveBeenCalledWith('/mock/path/to/external_domain_metadata.json', 'utf8');
  });

  it('should return error when file reading fails', async () => {
    // Arrange
    const errorMessage = 'File not found';
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error(errorMessage);
    });
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_external_domain_metadata(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Failed to retrieve external domain metadata: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_external_domain_metadata(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to retrieve external domain metadata: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when JSON parsing fails', async () => {
    // Arrange
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_external_domain_metadata(events);

    // Assert
    expect(result.status).toBe('error');
    expect(result.message).toContain('Failed to retrieve external domain metadata');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include both users and cards record types in the metadata', async () => {
    // Arrange
    const events = [mockFunctionInput];

    // Act
    const result = await get_external_domain_metadata(events);

    // Assert
    expect(result.status).toBe('success');
    expect(result.metadata).toBeDefined();
    expect(result.metadata.record_types).toBeDefined();
    expect(result.metadata.record_types.users).toBeDefined();
    expect(result.metadata.record_types.cards).toBeDefined();
  });
});