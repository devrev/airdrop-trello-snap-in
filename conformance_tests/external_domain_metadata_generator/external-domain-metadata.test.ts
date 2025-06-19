import { invokeFunction, getEnvironmentVariables } from './utils/http-client';
import { validateExternalDomainMetadata } from './utils/schema-validator';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Ajv from 'ajv';

// Close any open connections after all tests
afterAll(async () => {
  // Wait for any pending requests to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('External Domain Metadata Generation Tests', () => {
  // Test 1: Basic invocation test
  test('Should successfully invoke generate_external_domain_metadata function', async () => {
    // Arrange
    const functionName = 'generate_external_domain_metadata';
    
    // Act
    const response = await invokeFunction(functionName);
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Successfully generated');
    expect(response.data.function_result.metadata).toBeDefined();
  });

  // Test 2: Schema validation test
  test('Should return metadata that conforms to the external domain metadata schema', async () => {
    // Arrange
    const functionName = 'generate_external_domain_metadata';
    
    // Check for schema file in different locations
    const schemaLocations = [
      path.resolve(__dirname, 'external_domain_metadata_schema.json'),
      path.resolve(process.cwd(), '[resource]external_domain_metadata_schema.json')
    ];

    for (const location of schemaLocations) {
      console.log(`Checking for schema file at: ${location}, exists: ${fs.existsSync(location)}`);
    }
    // Act
    const response = await invokeFunction(functionName);
    const metadata = response.data.function_result.metadata;
    
    // Ensure the metadata has the required structure
    expect(metadata).toBeDefined();
    expect(metadata.schema_version).toBe('v0.2.0');
    expect(metadata.record_types).toBeDefined();
    expect(Object.keys(metadata.record_types).length).toBeGreaterThan(0);
    
    // Assert
    const validationResult = validateExternalDomainMetadata(metadata);
    
    // If validation fails, log the metadata for debugging
    if (!validationResult.valid && validationResult.errors && validationResult.errors.length > 0) {
      console.error('Schema validation errors:');
      for (const error of validationResult.errors) {
        console.error(`- ${error.instancePath || 'root'}: ${error.message || JSON.stringify(error)}`);
      }
      
      console.log('Metadata:', JSON.stringify(metadata, null, 2));
      
      // Check for specific issues in the metadata that might be causing validation failures
      if (metadata.record_types && metadata.record_types.cards && metadata.record_types.cards.fields) {
        const cardFields = metadata.record_types.cards.fields;
        // Check for collection fields that might be missing required properties
        Object.entries(cardFields).forEach(([fieldName, field]: [string, any]) => {
          if (field.collection && (!field.collection.min_length || !field.collection.max_length)) {
            console.error(`Field ${fieldName} has a collection without min_length or max_length`);
          }
        });
        
        // Check for struct fields that might be missing required properties
        Object.entries(cardFields).forEach(([fieldName, field]: [string, any]) => {
          if (field.type === 'struct' && (!field.struct || !field.struct.fields)) {
            console.error(`Field ${fieldName} is a struct but missing struct.fields`);
          }
        });
      }
      
      // Try direct validation with Ajv for more detailed errors
      try {
        const schemaContent = fs.readFileSync(path.resolve(__dirname, 'external_domain_metadata_schema.json'), 'utf8');
        const schema = JSON.parse(schemaContent);
        const ajv = new Ajv({ allErrors: true });
        ajv.addFormat('uri-reference', true);
        ajv.addFormat('regex', true);
        ajv.addFormat('uri', true);
        const validate = ajv.compile(schema);
        const valid = validate(metadata);
        if (!valid && validate.errors) {
          console.error('Direct Ajv validation errors:', validate.errors);
        }
      } catch (err) {
        console.error('Error during direct Ajv validation:', err);
      }
    }
    expect(validationResult.valid).toBe(true); 
  });

  // Test 3: Content validation test
  test('Should include required record types: cards and users', async () => {
    // Arrange
    const functionName = 'generate_external_domain_metadata';
    
    // Act
    const response = await invokeFunction(functionName);
    const metadata = response.data.function_result.metadata;
    
    // Assert
    expect(metadata.record_types).toBeDefined();
    expect(metadata.record_types.cards).toBeDefined();
    expect(metadata.record_types.users).toBeDefined();
    
    // Check descriptions
    expect(metadata.record_types.cards.description).toContain('Trello card');
    expect(metadata.record_types.users.description).toContain('Trello user');
  });

  // Test 4: Field validation test
  test('Should have required fields with correct types for each record type', async () => {
    // Arrange
    const functionName = 'generate_external_domain_metadata';
    
    // Act
    const response = await invokeFunction(functionName);
    const metadata = response.data.function_result.metadata;
    
    // Assert - Cards record type
    const cardsFields = metadata.record_types.cards.fields;
    expect(cardsFields.id).toBeDefined();
    expect(cardsFields.id.type).toBe('text');
    expect(cardsFields.id.is_identifier).toBe(true);
    expect(cardsFields.id.is_required).toBe(true);
    
    expect(cardsFields.name).toBeDefined();
    expect(cardsFields.name.type).toBe('text');
    expect(cardsFields.name.is_required).toBe(true);
    
    expect(cardsFields.description).toBeDefined();
    expect(cardsFields.description.type).toBe('text');
    
    expect(cardsFields.is_closed).toBeDefined();
    expect(cardsFields.is_closed.type).toBe('bool');
    
    expect(cardsFields.member_ids).toBeDefined();
    expect(cardsFields.member_ids.type).toBe('reference');
    expect(cardsFields.member_ids.reference.refers_to['#record:users']).toBeDefined();
    
    // Assert - Users record type
    const usersFields = metadata.record_types.users.fields;
    expect(usersFields.id).toBeDefined();
    expect(usersFields.id.type).toBe('text');
    expect(usersFields.id.is_identifier).toBe(true);
    expect(usersFields.id.is_required).toBe(true);
    
    expect(usersFields.username).toBeDefined();
    expect(usersFields.username.type).toBe('text');
    expect(usersFields.username.is_required).toBe(true);
    
    expect(usersFields.full_name).toBeDefined();
    expect(usersFields.full_name.type).toBe('text');
    
    expect(usersFields.email).toBeDefined();
    expect(usersFields.email.type).toBe('text');
  });
});