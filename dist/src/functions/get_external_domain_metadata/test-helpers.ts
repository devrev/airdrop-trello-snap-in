import { GetExternalDomainMetadataResponse } from './index';
import externalDomainMetadata from '../../core/external-domain-metadata.json';

/**
 * Validates that a response matches the expected success pattern with metadata
 */
export const validateSuccessResponseStructure = (result: GetExternalDomainMetadataResponse) => {
  expect(result.status).toBe('success');
  expect(result.message).toBe('Successfully retrieved external domain metadata');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.metadata).toEqual(externalDomainMetadata);
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: GetExternalDomainMetadataResponse,
  expectedMessage: string
) => {
  expect(result.status).toBe('failure');
  expect(result.message).toBe(expectedMessage);
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.metadata).toBeUndefined();
};

/**
 * Validates the metadata structure and schema
 */
export const validateMetadataStructure = (metadata: any) => {
  expect(metadata).toHaveProperty('schema_version', 'v0.2.0');
  expect(metadata).toHaveProperty('record_types');
  expect(metadata.record_types).toHaveProperty('users');
  expect(metadata.record_types).toHaveProperty('cards');
  expect(metadata.record_types).toHaveProperty('attachments');
  expect(metadata.record_types.users).toHaveProperty('name', 'Users');
  expect(metadata.record_types.cards).toHaveProperty('name', 'Cards');
  expect(metadata.record_types.attachments).toHaveProperty('name', 'Attachments');
};

/**
 * Validates users fields in metadata
 */
export const validateUsersFields = (metadata: any) => {
  const usersFields = metadata.record_types.users.fields;
  
  expect(usersFields).toHaveProperty('full_name');
  expect(usersFields.full_name).toEqual({
    name: 'Full Name',
    type: 'text',
    is_required: true,
  });

  expect(usersFields).toHaveProperty('username');
  expect(usersFields.username).toEqual({
    name: 'Username',
    type: 'text',
    is_required: true,
  });
};

/**
 * Validates cards fields in metadata
 */
export const validateCardsFields = (metadata: any) => {
  const cardsFields = metadata.record_types.cards.fields;
  
  expect(cardsFields).toHaveProperty('name');
  expect(cardsFields.name).toEqual({
    name: 'Name',
    type: 'text',
    is_required: true,
  });

  expect(cardsFields).toHaveProperty('url');
  expect(cardsFields.url).toEqual({
    name: 'URL',
    type: 'text',
    is_required: true,
  });

  expect(cardsFields).toHaveProperty('description');
  expect(cardsFields.description).toEqual({
    name: 'Description',
    type: 'rich_text',
    is_required: true,
  });

  expect(cardsFields).toHaveProperty('id_members');
  expect(cardsFields.id_members.name).toBe('ID Members');
  expect(cardsFields.id_members.type).toBe('reference');
  expect(cardsFields.id_members.is_required).toBe(true);
  expect(cardsFields.id_members.collection.max_length).toBe(50);
  expect(cardsFields.id_members.reference.refers_to).toHaveProperty('#record:users');
  expect(cardsFields.id_members.reference.refers_to['#record:users']).toEqual({});
};

/**
 * Validates field types and requirements
 */
export const validateFieldTypes = (metadata: any) => {
  const usersFields = metadata.record_types.users.fields;
  
  // Check that both fields are text type and required
  expect(usersFields.full_name.type).toBe('text');
  expect(usersFields.full_name.is_required).toBe(true);
  expect(usersFields.username.type).toBe('text');
  expect(usersFields.username.is_required).toBe(true);

  const cardsFields = metadata.record_types.cards.fields;
  
  // Check that all cards fields have correct types and requirements
  expect(cardsFields.name.type).toBe('text');
  expect(cardsFields.name.is_required).toBe(true);
  expect(cardsFields.url.type).toBe('text');
  expect(cardsFields.url.is_required).toBe(true);
  expect(cardsFields.description.type).toBe('rich_text');
  expect(cardsFields.description.is_required).toBe(true);
  expect(cardsFields.id_members.type).toBe('reference');
  expect(cardsFields.id_members.is_required).toBe(true);
  expect(cardsFields.created_by.type).toBe('reference');
  expect(cardsFields.created_by.is_required).toBe(true);
};

/**
 * Validates reference fields point to users
 */
export const validateReferenceFields = (metadata: any) => {
  const cardsFields = metadata.record_types.cards.fields;
  
  // Check id_members reference
  expect(cardsFields.id_members.reference.refers_to).toHaveProperty('#record:users');
  expect(cardsFields.id_members.reference.refers_to['#record:users']).toEqual({});
  
  // Check created_by reference
  expect(cardsFields.created_by.reference.refers_to).toHaveProperty('#record:users');
  expect(cardsFields.created_by.reference.refers_to['#record:users']).toEqual({});
  
  // Check that id_members has collection constraint
  expect(cardsFields.id_members.collection).toBeDefined();
  expect(cardsFields.id_members.collection.max_length).toBe(50);
};

/**
 * Validates record types structure
 */
export const validateRecordTypes = (metadata: any) => {
  const recordTypes = Object.keys(metadata.record_types);
  expect(recordTypes).toEqual(expect.arrayContaining(['users', 'cards', 'attachments']));
  expect(recordTypes).toHaveLength(3);
};

/**
 * Creates comprehensive test scenarios for metadata validation
 */
export const createMetadataValidationScenarios = () => {
  return {
    structure: {
      description: 'should return metadata with correct structure',
      validator: validateMetadataStructure,
    },
    usersFields: {
      description: 'should return metadata with correct users fields',
      validator: validateUsersFields,
    },
    cardsFields: {
      description: 'should return metadata with correct cards fields',
      validator: validateCardsFields,
    },
    fieldTypes: {
      description: 'should validate that all fields are correctly typed',
      validator: validateFieldTypes,
    },
    referenceFields: {
      description: 'should validate cards reference fields point to users',
      validator: validateReferenceFields,
    },
    recordTypes: {
      description: 'should validate that metadata contains users, cards, and attachments record types',
      validator: validateRecordTypes,
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
      expectedMessage: 'Unknown error occurred during metadata retrieval',
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