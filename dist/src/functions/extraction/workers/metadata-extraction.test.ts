import { ExtractorEventType } from '@devrev/ts-adaas';
import externalDomainMetadata from '../external-domain-metadata.json';

// Mock dependencies
jest.mock('@devrev/ts-adaas', () => {
  const mockEmit = jest.fn();
  const mockPush = jest.fn();
  const mockGetRepo = jest.fn(() => ({
    push: mockPush,
  }));
  const mockInitializeRepos = jest.fn();

  const mockAdapter = {
    emit: mockEmit,
    getRepo: mockGetRepo,
    initializeRepos: mockInitializeRepos,
  };

  return {
    ExtractorEventType: {
      ExtractionMetadataDone: 'EXTRACTION_METADATA_DONE',
      ExtractionMetadataError: 'EXTRACTION_METADATA_ERROR',
    },
    processTask: jest.fn((config: any) => {
      // Store the task and onTimeout functions for testing
      (global as any).__taskFunction = config.task;
      (global as any).__onTimeoutFunction = config.onTimeout;
    }),
    __mockEmit: mockEmit,
    __mockPush: mockPush,
    __mockGetRepo: mockGetRepo,
    __mockInitializeRepos: mockInitializeRepos,
    __mockAdapter: mockAdapter,
  };
});

jest.mock('../external-domain-metadata.json', () => ({
  schema_version: 'v0.2.0',
  record_types: {
    users: {
      name: 'Users',
      description: 'Users from Trello mapped to DevRev users',
      fields: {
        id: {
          type: 'text',
          name: 'ID',
          description: 'Unique identifier for the user',
          is_required: true,
          is_identifier: true,
          is_read_only: true,
        },
      },
    },
  },
}));

describe('metadata-extraction worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the global mock functions to their default implementations
    const { __mockInitializeRepos } = require('@devrev/ts-adaas');
    __mockInitializeRepos.mockImplementation(() => {});
  });

  it('should successfully extract metadata', async () => {
    const {
      __mockEmit,
      __mockPush,
      __mockGetRepo,
      __mockInitializeRepos,
      __mockAdapter,
    } = require('@devrev/ts-adaas');

    // Import the worker to trigger processTask
    require('./metadata-extraction');

    // Execute the task function
    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: __mockAdapter });

    // Verify repos were initialized
    expect(__mockInitializeRepos).toHaveBeenCalledWith([
      { itemType: 'external_domain_metadata' },
    ]);

    // Verify getRepo was called
    expect(__mockGetRepo).toHaveBeenCalledWith('external_domain_metadata');

    // Verify metadata was pushed
    expect(__mockPush).toHaveBeenCalledWith([externalDomainMetadata]);

    // Verify success event was emitted
    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionMetadataDone
    );
  });

  it('should handle errors during metadata extraction', async () => {
    const {
      __mockEmit,
      __mockInitializeRepos,
    } = require('@devrev/ts-adaas');

    // Mock initializeRepos to throw an error
    __mockInitializeRepos.mockImplementation(() => {
      throw new Error('Failed to initialize repos');
    });

    const mockAdapter = {
      emit: __mockEmit,
      getRepo: jest.fn(),
      initializeRepos: __mockInitializeRepos,
    };

    require('./metadata-extraction');

    const taskFunction = (global as any).__taskFunction;

    // Expect the function to throw
    await expect(taskFunction({ adapter: mockAdapter })).rejects.toThrow(
      'Failed to initialize repos'
    );
  });

  it('should handle timeout', async () => {
    const { __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');

    require('./metadata-extraction');

    const onTimeoutFunction = (global as any).__onTimeoutFunction;
    await onTimeoutFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionMetadataError,
      {
        error: { message: 'Failed to extract metadata. Lambda timeout.' },
      }
    );
  });

  it('should handle null repo from getRepo', async () => {
    const {
      __mockEmit,
      __mockInitializeRepos,
    } = require('@devrev/ts-adaas');

    // Create a mock adapter with getRepo returning null
    const mockGetRepo = jest.fn(() => null);
    const mockAdapter = {
      emit: __mockEmit,
      getRepo: mockGetRepo,
      initializeRepos: __mockInitializeRepos,
    };

    require('./metadata-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: mockAdapter });

    // Should still emit success even if repo is null (optional chaining)
    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionMetadataDone
    );
  });

  it('should log error before throwing', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const {
      __mockInitializeRepos,
    } = require('@devrev/ts-adaas');

    const testError = new Error('Test error');
    __mockInitializeRepos.mockImplementation(() => {
      throw testError;
    });

    const mockAdapter = {
      emit: jest.fn(),
      getRepo: jest.fn(),
      initializeRepos: __mockInitializeRepos,
    };

    require('./metadata-extraction');

    const taskFunction = (global as any).__taskFunction;

    await expect(taskFunction({ adapter: mockAdapter })).rejects.toThrow(
      'Test error'
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in metadata extraction:',
      'Test error'
    );

    consoleErrorSpy.mockRestore();
  });
});