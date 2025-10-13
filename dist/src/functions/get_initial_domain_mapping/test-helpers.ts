import { GetInitialDomainMappingResponse } from './index';
import initialDomainMapping from '../../core/initial-domain-mapping.json';
import {
  validateMappingStructure,
  validateUsersMapping,
  validateCardsMapping,
  validatePossibleRecordTypeMapping,
  validateCardsPossibleRecordTypeMapping,
  validateStockFieldMappings,
  validateCardsStockFieldMappings,
  validateMappingDirections,
  validateCardsMappingDirections,
  validateBothRecordTypeMappings,
  validateTransformationMethods,
} from './test-validators';

/**
 * Validates that a response matches the expected success pattern with mapping
 */
export const validateSuccessResponseStructure = (result: GetInitialDomainMappingResponse) => {
  expect(result.status).toBe('success');
  expect(result.message).toBe('Successfully retrieved initial domain mapping');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.mapping).toEqual(initialDomainMapping);
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: GetInitialDomainMappingResponse,
  expectedMessage: string
) => {
  expect(result.status).toBe('failure');
  expect(result.message).toBe(expectedMessage);
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.mapping).toBeUndefined();
};

/**
 * Creates comprehensive test scenarios for mapping validation
 */
export const createMappingValidationScenarios = () => {
  return {
    structure: {
      description: 'should return mapping with correct structure',
      validator: validateMappingStructure,
    },
    usersMapping: {
      description: 'should return mapping with correct users configuration',
      validator: validateUsersMapping,
    },
    possibleRecordTypeMapping: {
      description: 'should return mapping with correct possible record type mapping',
      validator: validatePossibleRecordTypeMapping,
    },
    cardsMapping: {
      description: 'should return mapping with correct cards configuration',
      validator: validateCardsMapping,
    },
    cardsPossibleRecordTypeMapping: {
      description: 'should return mapping with correct cards possible record type mapping',
      validator: validateCardsPossibleRecordTypeMapping,
    },
    cardsStockFieldMappings: {
      description: 'should return mapping with correct cards stock field mappings',
      validator: validateCardsStockFieldMappings,
    },
    stockFieldMappings: {
      description: 'should return mapping with correct stock field mappings',
      validator: validateStockFieldMappings,
    },
    mappingDirections: {
      description: 'should validate that all mappings are forward-only',
      validator: validateMappingDirections,
    },
    cardsMappingDirections: {
      description: 'should validate that all cards mappings are forward-only',
      validator: validateCardsMappingDirections,
    },
    transformationMethods: {
      description: 'should validate that all mappings use use_directly transformation method',
      validator: validateTransformationMethods,
    },
    bothRecordTypeMappings: {
      description: 'should validate that both users and cards record type mappings exist',
      validator: validateBothRecordTypeMappings,
    },
  };
};

/**
 * Creates error handling test scenarios
 */
export const createErrorHandlingScenarios = () => {
  return {
    unknownError: {
      description: 'should handle unknown errors gracefully',
      expectedMessage: 'Unknown error occurred during mapping retrieval',
      expectedConsoleLog: {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      },
    },
    validationError: {
      description: 'should log error details when validation fails',
      expectedMessage: 'Invalid input: events array cannot be empty',
      expectedConsoleLog: {
        error_message: 'Invalid input: events array cannot be empty',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      },
    },
  };
};