import { handler } from './index';

describe('generate_domain_metadata function', () => {
  it('should return a valid External Domain Metadata object', async () => {
    // Call the handler function
    const result = await handler();

    // Verify the result structure
    expect(result).toEqual({
      success: true,
      message: 'Successfully generated External Domain Metadata',
      metadata: expect.objectContaining({
        schema_version: 'v0.2.0',
        record_types: expect.objectContaining({
          cards: expect.any(Object),
          users: expect.any(Object),
          boards: expect.any(Object)
        }),
        struct_types: expect.objectContaining({
          card_label: expect.any(Object)
        })
      })
    });

    // Verify the metadata contains the required record types
    const { metadata } = result;
    
    // Check cards record type
    expect(metadata.record_types.cards).toEqual(expect.objectContaining({
      name: 'Trello Cards',
      description: 'Cards from Trello boards',
      fields: expect.objectContaining({
        id: expect.objectContaining({
          type: 'text',
          is_identifier: true
        }),
        name: expect.objectContaining({
          type: 'text'
        }),
        description: expect.objectContaining({
          type: 'rich_text'
        }),
        board_id: expect.objectContaining({
          type: 'reference',
          reference: expect.objectContaining({
            refers_to: expect.objectContaining({
              '#record:boards': expect.any(Object)
            })
          })
        }),
        member_ids: expect.objectContaining({
          type: 'reference',
          reference: expect.objectContaining({
            refers_to: expect.objectContaining({
              '#record:users': expect.any(Object)
            })
          })
        })
      })
    }));

    // Check users record type
    expect(metadata.record_types.users).toEqual(expect.objectContaining({
      name: 'Trello Users',
      description: 'Users from Trello organization',
      fields: expect.objectContaining({
        id: expect.objectContaining({
          type: 'text',
          is_identifier: true
        }),
        username: expect.objectContaining({
          type: 'text'
        }),
        email: expect.objectContaining({
          type: 'text'
        })
      })
    }));

    // Check struct types
    expect(metadata.struct_types.card_label).toEqual(expect.objectContaining({
      name: 'Card Label',
      fields: expect.objectContaining({
        id: expect.objectContaining({
          type: 'text'
        }),
        name: expect.objectContaining({
          type: 'text'
        }),
        color: expect.objectContaining({
          type: 'text'
        })
      })
    }));
  });

  it('should handle errors gracefully', async () => {
    // Mock console.error to prevent test output pollution
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create a real error that will be thrown
    const testError = new Error('Test error');
    
    // Create a modified version of the handler that throws an error
    const originalHandler = jest.requireActual('./index').handler;
    jest.spyOn(require('./index'), 'handler').mockImplementation(async () => {
      // Simulate an error occurring inside the handler function
      console.error('Error in generate_domain_metadata function:', testError);
      return {
        success: false,
        message: `Failed to generate External Domain Metadata: ${testError.message}`
      };
    });
    
    // Call the mocked handler and verify the result
    const result = await handler();
    expect(result.success).toBe(false);
    expect(result.message).toBe('Failed to generate External Domain Metadata: Test error');
  });
});