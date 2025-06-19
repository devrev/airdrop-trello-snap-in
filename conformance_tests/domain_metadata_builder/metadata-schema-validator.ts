import Ajv from 'ajv';
import schema from './external_domain_metadata_schema.json';

// Configure Ajv with options to handle the schema properly
const ajv = new Ajv({
  strict: false,
  allErrors: true
});
const validate = ajv.compile(schema);

export function validateMetadataSchema(data: any): { valid: boolean; errors?: any[] } {
  const valid = validate(data);
  return { valid: !!valid, errors: validate.errors || undefined };
}