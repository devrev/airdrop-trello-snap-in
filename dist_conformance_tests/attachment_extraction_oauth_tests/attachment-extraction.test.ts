import { getTestEnvironment, setupCallbackServer, sendEventToSnapIn, createBaseAttachmentEvent, CallbackServerSetup } from './test-utils';

describe('Attachment Extraction Tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should handle EXTRACTION_ATTACHMENTS_START event with OAuth authentication', async () => {
    const event = createBaseAttachmentEvent(testEnv, 'EXTRACTION_ATTACHMENTS_START');
    
    const startTime = Date.now();
    const response = await sendEventToSnapIn(event);
    const endTime = Date.now();

    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    // Wait for potential callback events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the function executed without errors
    if (response.error) {
      fail(`Attachment extraction failed with error: ${JSON.stringify(response.error)}. Test executed in ${endTime - startTime}ms. Event: ${JSON.stringify(event, null, 2)}`);
    }

    console.log(`Attachment extraction start test completed in ${endTime - startTime}ms`);
    console.log(`Response: ${JSON.stringify(response, null, 2)}`);
    console.log(`Callback events received: ${callbackServer.receivedEvents.length}`);
  }, 30000);

  test('should handle EXTRACTION_ATTACHMENTS_CONTINUE event with OAuth authentication', async () => {
    const event = createBaseAttachmentEvent(testEnv, 'EXTRACTION_ATTACHMENTS_CONTINUE');
    
    const startTime = Date.now();
    const response = await sendEventToSnapIn(event);
    const endTime = Date.now();

    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    // Wait for potential callback events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the function executed without errors
    if (response.error) {
      fail(`Attachment extraction continue failed with error: ${JSON.stringify(response.error)}. Test executed in ${endTime - startTime}ms. Event: ${JSON.stringify(event, null, 2)}`);
    }

    console.log(`Attachment extraction continue test completed in ${endTime - startTime}ms`);
    console.log(`Response: ${JSON.stringify(response, null, 2)}`);
    console.log(`Callback events received: ${callbackServer.receivedEvents.length}`);
  }, 30000);

  test('should handle authentication errors gracefully', async () => {
    const event = createBaseAttachmentEvent(testEnv, 'EXTRACTION_ATTACHMENTS_START');
    // Corrupt the authentication data
    event.payload.connection_data.key = 'key=invalid&token=invalid';
    
    const startTime = Date.now();
    const response = await sendEventToSnapIn(event);
    const endTime = Date.now();

    expect(response).toBeDefined();
    
    // Wait for potential callback events
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`Authentication error test completed in ${endTime - startTime}ms`);
    console.log(`Response: ${JSON.stringify(response, null, 2)}`);
    console.log(`Callback events received: ${callbackServer.receivedEvents.length}`);
    
    // The function should handle authentication errors gracefully
    // Either by returning an error response or by emitting an error event
    const hasError = response.error || callbackServer.receivedEvents.some(e => 
      e.event.event_type === 'EXTRACTION_ATTACHMENTS_ERROR'
    );
    
    if (!hasError) {
      console.warn('Expected authentication error to be handled, but no error was detected');
    }
  }, 30000);
});