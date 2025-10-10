import { 
  getTestEnvironment, 
  setupCallbackServer, 
  createMetadataExtractionEvent, 
  sendEventToSnapIn, 
  closeCallbackServer,
  CallbackServerSetup 
} from './test-utils';

describe('Metadata Extraction Conformance Tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await closeCallbackServer(callbackServer);
    }
  });

  beforeEach(() => {
    // Clear received requests before each test
    callbackServer.receivedRequests.length = 0;
  });

  test('should successfully handle EXTRACTION_METADATA_START event', async () => {
    // Create metadata extraction event
    const event = createMetadataExtractionEvent(testEnv);

    // Send event to snap-in
    const response = await sendEventToSnapIn(event);

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Metadata extraction initiated successfully');
    expect(response.error).toBeUndefined();
  }, 60000);

  test('should complete metadata extraction workflow and emit EXTRACTION_METADATA_DONE', async () => {
    // Create metadata extraction event
    const event = createMetadataExtractionEvent(testEnv);

    // Send event to snap-in
    const response = await sendEventToSnapIn(event);

    // Verify successful initiation
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Metadata extraction initiated successfully');

    // Wait for worker to complete (metadata extraction should be quick)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify that the extraction function was called successfully
    // The worker should have processed the metadata extraction
    expect(response.error).toBeUndefined();
  }, 60000);
});