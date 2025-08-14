import { get_initial_domain_mapping } from './index';
import { FunctionInput } from '../../core/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock the fs module
jest.mock('fs');
jest.mock('path');

describe('get_initial_domain_mapping function', () => {
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
      function_name: 'get_initial_domain_mapping',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai/'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  // Mock mapping content
  const mockMapping = {
    additional_mappings: {
      record_type_mappings: {
        users: {
          default_mapping: {
            object_type: "devu",
            object_category: "stock"
          },
          possible_record_type_mappings: [
            {
              devrev_leaf_type: "devu",
              forward: true,
              reverse: false,
              shard: {
                mode: "create_shard",
                devrev_leaf_type: {
                  object_type: "devu",
                  object_category: "stock"
                },
                stock_field_mappings: {
                  display_name: {
                    forward: true,
                    reverse: false,
                    primary_external_field: "username",
                    transformation_method_for_set: {
                      transformation_method: "use_directly"
                    }
                  },
                  full_name: {
                    forward: true,
                    reverse: false,
                    primary_external_field: "full_name",
                    transformation_method_for_set: {
                      transformation_method: "use_directly"
                    }
                  }
                }
              }
            }
          ]
        },
        cards: {
          default_mapping: {
            object_type: "issue",
            object_category: "stock"
          },
          possible_record_type_mappings: [
            {
              devrev_leaf_type: "issue",
              forward: true,
              reverse: false,
              shard: {
                mode: "create_shard",
                devrev_leaf_type: {
                  object_type: "issue",
                  object_category: "stock"
                },
                stock_field_mappings: {
                  title: {
                    forward: true,
                    reverse: false,
                    primary_external_field: "name",
                    transformation_method_for_set: {
                      transformation_method: "use_directly"
                    }
                  },
                  item_url_field: {
                    forward: true,
                    reverse: false,
                    primary_external_field: "url",
                    transformation_method_for_set: {
                      transformation_method: "use_directly"
                    }
                  },
                  body: {
                    forward: true,
                    reverse: false,
                    primary_external_field: "description",
                    transformation_method_for_set: {
                      transformation_method: "use_rich_text"
                    }
                  },
                  owned_by_ids: {
                    forward: true,
                    reverse: false,
                    primary_external_field: "id_members",
                    transformation_method_for_set: {
                      transformation_method: "use_directly"
                    }
                  },
                  priority: {
                    forward: true,
                    reverse: false,
                    transformation_method_for_set: {
                      transformation_method: "use_fixed_value",
                      value: "enum_value",
                      enum: "P2"
                    }
                  },
                  stage: {
                    forward: true,
                    reverse: false,
                    transformation_method_for_set: {
                      transformation_method: "use_fixed_value",
                      value: "enum_value",
                      enum: "triage"
                    }
                  },
                  applies_to_part_id: {
                    forward: true,
                    reverse: false,
                    transformation_method_for_set: {
                      transformation_method: "use_devrev_record",
                      leaf_type: {
                        object_type: "product",
                        object_category: "stock"
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock path.resolve to return a fixed path
    (path.resolve as jest.Mock).mockReturnValue('/mock/path/to/initial_domain_mapping.json');
    
    // Mock fs.readFileSync to return mock mapping
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockMapping));
  });

  it('should return success with mapping when retrieval is successful', async () => {
    // Arrange
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await get_initial_domain_mapping(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully retrieved initial domain mapping',
      mapping: mockMapping
    });
    expect(consoleSpy).toHaveBeenCalledWith('Get initial domain mapping function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully retrieved initial domain mapping');
    expect(fs.readFileSync).toHaveBeenCalledWith('/mock/path/to/initial_domain_mapping.json', 'utf8');
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
    const result = await get_initial_domain_mapping(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Failed to retrieve initial domain mapping: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_initial_domain_mapping(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to retrieve initial domain mapping: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when JSON parsing fails', async () => {
    // Arrange
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_initial_domain_mapping(events);

    // Assert
    expect(result.status).toBe('error');
    expect(result.message).toContain('Failed to retrieve initial domain mapping');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include users record type mapping in the mapping', async () => {
    // Arrange
    const events = [mockFunctionInput];

    // Act
    const result = await get_initial_domain_mapping(events);

    // Assert
    expect(result.status).toBe('success');
    expect(result.mapping).toBeDefined();
    expect(result.mapping.additional_mappings.record_type_mappings.users).toBeDefined();
    expect(result.mapping.additional_mappings.record_type_mappings.users.default_mapping.object_type).toBe('devu');
  });

  it('should include cards record type mapping in the mapping', async () => {
    // Arrange
    const events = [mockFunctionInput];

    // Act
    const result = await get_initial_domain_mapping(events);

    // Assert
    expect(result.status).toBe('success');
    expect(result.mapping).toBeDefined();
    expect(result.mapping.additional_mappings.record_type_mappings.cards).toBeDefined();
    expect(result.mapping.additional_mappings.record_type_mappings.cards.default_mapping.object_type).toBe('issue');
    
    // Check specific field mappings
    const cardsMappings = result.mapping.additional_mappings.record_type_mappings.cards.possible_record_type_mappings[0].shard.stock_field_mappings;
    
    // Check external field mappings
    expect(cardsMappings.title.primary_external_field).toBe('name');
    expect(cardsMappings.item_url_field.primary_external_field).toBe('url');
    expect(cardsMappings.body.primary_external_field).toBe('description');
    expect(cardsMappings.owned_by_ids.primary_external_field).toBe('id_members');
    
    // Check fixed value mappings
    expect(cardsMappings.priority.transformation_method_for_set.enum).toBe('P2');
    expect(cardsMappings.stage.transformation_method_for_set.enum).toBe('triage');
    
    // Check DevRev record mapping
    expect(cardsMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_type).toBe('product');
  });
});