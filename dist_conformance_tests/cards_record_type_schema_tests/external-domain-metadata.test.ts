import { Server } from 'http';
import {
  getTestCredentials,
  createTestEvent,
  setupCallbackServer,
  callSnapInFunction,
  validateWithChefCli,
  TestCredentials,
} from './test-utils';

describe('External Domain Metadata Conformance Tests', () => {
  let credentials: TestCredentials;
  let callbackServer: Server;

  beforeAll(async () => {
    // Get test credentials
    credentials = getTestCredentials();

    // Setup callback server
    const { server } = await setupCallbackServer();
    callbackServer = server;
  });

  afterAll(async () => {
    // Cleanup callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  test('should return external domain metadata with cards record type', async () => {
    // Create test event for get_external_domain_metadata function
    const event = createTestEvent(credentials, 'get_external_domain_metadata');

    // Call the function through the snap-in server
    const response = await callSnapInFunction('get_external_domain_metadata', event);

    // Validate basic response structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('success');
    expect(response.function_result.metadata).toBeDefined();

    const metadata = response.function_result.metadata;

    // Basic structure validation
    expect(metadata.schema_version).toBe('v0.2.0');
    expect(metadata.record_types).toBeDefined();
    expect(typeof metadata.record_types).toBe('object');

    // Validate that users record type exists (preserving existing record types)
    expect(metadata.record_types.users).toBeDefined();
    expect(metadata.record_types.users.name).toBe('Users');

    // Validate that cards record type exists
    expect(metadata.record_types.cards).toBeDefined();
    expect(metadata.record_types.cards.name).toBe('Cards');

    const cardsRecordType = metadata.record_types.cards;
    expect(cardsRecordType.fields).toBeDefined();

    // Validate cards fields
    const fields = cardsRecordType.fields;

    // name field
    expect(fields.name).toBeDefined();
    expect(fields.name.name).toBe('Name');
    expect(fields.name.type).toBe('text');
    expect(fields.name.is_required).toBe(true);

    // url field
    expect(fields.url).toBeDefined();
    expect(fields.url.name).toBe('URL');
    expect(fields.url.type).toBe('text');
    expect(fields.url.is_required).toBe(true);

    // description field
    expect(fields.description).toBeDefined();
    expect(fields.description.name).toBe('Description');
    expect(fields.description.type).toBe('rich_text');
    expect(fields.description.is_required).toBe(true);

    // id_members field
    expect(fields.id_members).toBeDefined();
    expect(fields.id_members.name).toBe('ID Members');
    expect(fields.id_members.type).toBe('reference');
    expect(fields.id_members.is_required).toBe(true);
    expect(fields.id_members.collection).toBeDefined();
    expect(fields.id_members.collection.max_length).toBe(50);
    expect(fields.id_members.reference).toBeDefined();
    expect(fields.id_members.reference.refers_to).toBeDefined();
    expect(fields.id_members.reference.refers_to['#record:users']).toBeDefined();

    // created_by field
    expect(fields.created_by).toBeDefined();
    expect(fields.created_by.name).toBe('Created By');
    expect(fields.created_by.type).toBe('reference');
    expect(fields.created_by.is_required).toBe(true);
    expect(fields.created_by.reference).toBeDefined();
    expect(fields.created_by.reference.refers_to).toBeDefined();
    expect(fields.created_by.reference.refers_to['#record:users']).toBeDefined();
    expect(fields.created_by.collection).toBeUndefined(); // Single reference, not array
  });

  test('should validate external domain metadata with Chef CLI', async () => {
    // Create test event for get_external_domain_metadata function
    const event = createTestEvent(credentials, 'get_external_domain_metadata');

    // Call the function through the snap-in server
    const response = await callSnapInFunction('get_external_domain_metadata', event);

    // Validate basic response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('success');
    expect(response.function_result.metadata).toBeDefined();

    const metadata = response.function_result.metadata;

    // Validate with Chef CLI
    const validation = await validateWithChefCli(metadata, credentials.chefCliPath);

    if (!validation.success) {
      if (validation.stderr.includes('command not found') || validation.stderr.includes('No such file')) {
        fail(`Chef CLI is not available at path: ${credentials.chefCliPath}. Error: ${validation.stderr}`);
      } else {
        fail(`External domain metadata validation failed with Chef CLI. Stdout: ${validation.stdout}, Stderr: ${validation.stderr}`);
      }
    }

    expect(validation.success).toBe(true);
  });
});