import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

/**
 * Validates the external domain metadata against the schema
 * 
 * @param metadata - The metadata to validate
 * @returns Object containing validation result and errors if any
 */
export function validateExternalDomainMetadata(metadata: any): {
  valid: boolean; 
  errors: any[]
} {
  try {
    // Try to find the schema file in different possible locations with better error handling
    console.log('Looking for schema file...');
    let schemaContent: string | null = null;
    const possiblePaths = [
      path.resolve(process.cwd(), 'external_domain_metadata_schema.json'),
      path.resolve(process.cwd(), '[resource]external_domain_metadata_schema.json'),
      path.resolve(__dirname, '../external_domain_metadata_schema.json')
    ];
    
    for (const schemaPath of possiblePaths) {
      try {
        if (fs.existsSync(schemaPath)) {
          const content = fs.readFileSync(schemaPath, 'utf8');
          schemaContent = content;
          console.log(`Found schema file at: ${schemaPath}`);
          break;
        }
      } catch (err) {
        console.warn(`Could not read schema from ${schemaPath}: ${err}`);
      }
    }

    if (!schemaContent) {
      // As a fallback, try to load the schema directly from the current directory
      try {
        const inlineSchemaPath = path.resolve(process.cwd(), 'external_domain_metadata_schema.json');
        console.log(`Trying fallback path: ${inlineSchemaPath}, exists: ${fs.existsSync(inlineSchemaPath)}`);
        if (fs.existsSync(inlineSchemaPath)) {
          schemaContent = fs.readFileSync(inlineSchemaPath, 'utf8');
          console.log(`Found schema file at fallback path: ${inlineSchemaPath}`);
        }
      } catch (err) {
        console.warn(`Could not read inline schema: ${err}`);
      }
      console.error('Schema file not found in any of the expected locations. Paths tried:', possiblePaths);
      throw new Error('Could not find schema file in any of the expected locations');
    }

    // Ensure we have valid JSON content
    if (!schemaContent || schemaContent.trim() === '') {
      console.error('Schema file is empty or invalid');
      throw new Error('Schema file is empty or invalid');
    }

    const schema = JSON.parse(schemaContent);

    // Create a new Ajv instance
    const ajv = new Ajv({ allErrors: true });

    // Add missing formats to prevent errors
    ajv.addFormat('uri-reference', true);
    ajv.addFormat('regex', true);
    // Add custom formats if needed
    ajv.addFormat('uri', true); // Treat URI format as a string

    const validate = ajv.compile(schema);
    
    // Log the metadata for debugging
    console.log('Validating metadata structure:', JSON.stringify(metadata, null, 2).substring(0, 500) + '...');
    
    const valid = validate(metadata);
    
    if (!valid && validate.errors) {
      console.error('Schema validation errors:');
      let errorDetails = [];
      for (const error of validate.errors) {
        const errorMsg = `- ${error.instancePath || 'root'}: ${error.message || JSON.stringify(error)}`;
        console.error(errorMsg);
        errorDetails.push({
          path: error.instancePath || 'root',
          message: error.message || JSON.stringify(error),
          params: error.params
        });
        
        if (error.params) {
          console.error(`  Params: ${JSON.stringify(error.params)}`);
        }
        
      }
    }

    return {
      valid: valid === true,
      errors: validate.errors || []
    };
  } catch (error) {
    console.error('Error validating metadata:', error);
    return { 
      valid: false,
      errors: [{ message: `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}` }]
    };
  }
}