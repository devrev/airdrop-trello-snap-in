import { createBaseEventPayload, sendRequestToSnapIn, setupCallbackServer } from './utils/test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Get External Domain Metadata Function Tests', () => {
  let callbackServer: any;
  
  beforeAll(() => {
    // Setup callback server
    callbackServer = setupCallbackServer();
  });
  
  afterAll(() => {
    // Close callback server
    if (callbackServer && callbackServer.server) {
      callbackServer.server.close();
    }
  });
  
  it('should successfully retrieve the external domain metadata', async () => {
    // Create event payload
    const eventPayload = createBaseEventPayload();
    
    // Send request to snap-in server
    const response = await sendRequestToSnapIn('get_external_domain_metadata', eventPayload);
    
    // Validate response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toBe('Successfully retrieved External Domain Metadata');
    expect(response.function_result.metadata).toBeDefined();
    
    // Validate metadata structure
    const metadata = response.function_result.metadata;
    expect(metadata.schema_version).toBeDefined();
    expect(metadata.record_types).toBeDefined();
    
    // Validate users record type
    expect(metadata.record_types.users).toBeDefined();
    expect(metadata.record_types.users.fields).toBeDefined();
    expect(metadata.record_types.users.fields.full_name).toBeDefined();
    expect(metadata.record_types.users.fields.username).toBeDefined();
    
    // Validate cards record type
    expect(metadata.record_types.cards).toBeDefined();
    expect(metadata.record_types.cards.fields).toBeDefined();
    expect(metadata.record_types.cards.fields.name).toBeDefined();
    expect(metadata.record_types.cards.fields.url).toBeDefined();
    expect(metadata.record_types.cards.fields.description).toBeDefined();
    expect(metadata.record_types.cards.fields.id_members).toBeDefined();
    
    // Save metadata to file for use in other tests
    const metadataFilePath = path.join(__dirname, 'test-data/external-domain-metadata.json');
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadata, null, 2));
  });
});