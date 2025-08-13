import * as fs from 'fs';
import * as path from 'path';
import { createBasicEvent, invokeFunction, validateWithChefCli } from './utils';
import { startCallbackServer } from './server';

describe('Initial Domain Mappings Tests', () => {
  let callbackServer: any;

  beforeAll(() => {
    // Start the callback server
    callbackServer = startCallbackServer();
  });

  afterAll(() => {
    // Close the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  test('get_initial_domain_mappings function returns valid response', async () => {
    // Create a basic event for the get_initial_domain_mappings function
    const event = createBasicEvent('get_initial_domain_mappings');
    
    // Invoke the function
    const response = await invokeFunction(event);
    
    // Validate the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.mappings).toBeDefined();
  });

  test('Initial domain mappings pass Chef CLI validation', async () => {
    // First, get the external domain metadata
    const metadataEvent = createBasicEvent('get_external_domain_metadata');
    const metadataResponse = await invokeFunction(metadataEvent);
    
    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.data.function_result.success).toBe(true);
    expect(metadataResponse.data.function_result.metadata).toBeDefined();
    
    // Save the metadata to a temporary file for Chef CLI
    const metadataPath = path.join(__dirname, 'temp-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadataResponse.data.function_result.metadata));
    
    try {
      // Get the initial domain mappings
      const mappingsEvent = createBasicEvent('get_initial_domain_mappings');
      const mappingsResponse = await invokeFunction(mappingsEvent);
      
      expect(mappingsResponse.status).toBe(200);
      expect(mappingsResponse.data.function_result.success).toBe(true);
      expect(mappingsResponse.data.function_result.mappings).toBeDefined();
      
      // Validate with Chef CLI
      const chefResult = await validateWithChefCli(
        mappingsResponse.data.function_result.mappings,
        metadataPath
      );
      
      // Check that the Chef CLI validation passed
      expect(Array.isArray(chefResult)).toBe(true);
      expect(chefResult.length).toBeGreaterThan(0);
      
      const firstResult = chefResult[0];
      expect(firstResult).toHaveProperty('RemainingDeficiencies');
      expect(firstResult).toHaveProperty('Warnings');
      
      // Both RemainingDeficiencies and Warnings should be null for a successful validation
      expect(firstResult.RemainingDeficiencies).toBeNull();
      expect(firstResult.Warnings).toBeNull();
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    }
  });
});