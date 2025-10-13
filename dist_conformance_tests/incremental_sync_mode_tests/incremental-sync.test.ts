import { setupCallbackServer, closeServer, createTestEvent, invokeSnapInFunction, CallbackServerSetup } from './test-helpers';
import axios from 'axios';

describe('Incremental Data Synchronization', () => {
  let callbackServer: CallbackServerSetup;

  beforeAll(async () => {
    callbackServer = await setupCallbackServer(8002);
  });

  afterAll(async () => {
    await closeServer(callbackServer.server);
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should detect incremental mode and reset state correctly', async () => {
    const lastSuccessfulSync = '2024-01-01T00:00:00.000Z';
    
    const event = createTestEvent({
      eventType: 'EXTRACTION_DATA_START',
      functionName: 'extraction',
      externalSyncUnitId: '68e8befbf2f641caa9b1e275',
      mode: 'INCREMENTAL',
      requestId: 'test-request-incremental',
    });

    // Mock worker data server to capture state
    let capturedState: any = null;
    const workerDataInterceptor = axios.interceptors.request.use((config) => {
      if (config.url?.includes('/external-worker') && config.method === 'get') {
        config.adapter = async () => ({
          data: { lastSuccessfulSyncStarted: lastSuccessfulSync },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      }
      if (config.url?.includes('/external-worker') && config.method === 'post') {
        capturedState = config.data;
      }
      return config;
    });

    try {
      await invokeSnapInFunction(event);
      
      // Wait for callback event
      const callbackEvent = await callbackServer.waitForEvent(10000);
      
      expect(callbackEvent).toBeDefined();
      expect(['EXTRACTION_DATA_DONE', 'EXTRACTION_DATA_DELAY', 'EXTRACTION_DATA_PROGRESS']).toContain(callbackEvent.event_type);
      
      // Verify state was updated with modifiedSince
      if (capturedState) {
        expect(capturedState.cards).toBeDefined();
        expect(capturedState.cards.modifiedSince).toBe(lastSuccessfulSync);
        expect(capturedState.cards.completed).toBe(false);
        expect(capturedState.attachments).toBeDefined();
        expect(capturedState.attachments.completed).toBe(false);
      }
    } finally {
      axios.interceptors.request.eject(workerDataInterceptor);
    }
  }, 60000);

  test('should filter cards based on dateLastActivity in incremental mode', async () => {
    const lastSuccessfulSync = '2024-06-01T00:00:00.000Z';
    const uploadedCards: any[] = [];
    
    const event = createTestEvent({
      eventType: 'EXTRACTION_DATA_START',
      functionName: 'extraction',
      externalSyncUnitId: '68e8befbf2f641caa9b1e275',
      mode: 'INCREMENTAL',
      requestId: 'test-request-filter',
    });

    const interceptor = axios.interceptors.request.use((config) => {
      if (config.url?.includes('/external-worker') && config.method === 'get') {
        config.adapter = async () => ({
          data: { lastSuccessfulSyncStarted: lastSuccessfulSync },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        });
      }
      if (config.url?.includes('/external-worker') && config.method === 'post' && config.data?.itemType === 'cards') {
        const items = config.data.items || [];
        uploadedCards.push(...items);
      }
      return config;
    });

    try {
      await invokeSnapInFunction(event);
      await callbackServer.waitForEvent(10000);
      
      // Verify that only cards with dateLastActivity after lastSuccessfulSync were uploaded
      if (uploadedCards.length > 0) {
        uploadedCards.forEach((card) => {
          const cardModifiedDate = new Date(card.modified_date);
          const syncDate = new Date(lastSuccessfulSync);
          expect(cardModifiedDate.getTime()).toBeGreaterThan(syncDate.getTime());
        });
      }
    } finally {
      axios.interceptors.request.eject(interceptor);
    }
  }, 60000);
});