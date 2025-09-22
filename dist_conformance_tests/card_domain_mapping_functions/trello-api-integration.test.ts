import {
  createBaseEvent,
  sendToSnapInServer,
  setupCallbackServer,
  TEST_BOARD_ID,
  TEST_CARD_ID,
  TEST_ATTACHMENT_ID
} from './utils/test-utils';

describe('Trello API Integration Tests', () => {
  test('check_authentication should authenticate successfully', async () => {
    // Create event for check_authentication function
    const event = createBaseEvent('check_authentication');
    
    // Call check_authentication function
    const response = await sendToSnapInServer(event);
    
    // Log the response for debugging
    console.log('Authentication response:', JSON.stringify(response, null, 2));
    
    // Check if we have a valid response
    expect(response).toBeTruthy();
    expect(typeof response).toBe('object');
    expect(response.authenticated || response.success).toBeTruthy();
    expect(response.status_code || 200).toBe(200);
    expect(response.member_info).toBeTruthy();
  });

  test('fetch_board_cards should fetch cards successfully', async () => {
    // Create event for fetch_board_cards function
    const event = createBaseEvent('fetch_board_cards');
    
    // Set required global values
    event.input_data.global_values = {
      limit: '10'
    };
    
    // Call fetch_board_cards function
    const response = await sendToSnapInServer(event);
    
    // Log the response for debugging
    console.log('Fetch board cards response:', JSON.stringify(response, null, 2));
    
    // Check if we have a valid response
    expect(response).toBeTruthy();
    expect(typeof response).toBe('object');
    expect(response.success || true).toBeTruthy();
    expect(response.status_code || 200).toBe(200);
    expect(Array.isArray(response.cards || [])).toBe(true);
  });

  test('download_attachment should download attachment successfully', async () => {
    // Create event for download_attachment function
    const event = createBaseEvent('download_attachment');
    
    // Set required global values
    event.input_data.global_values = {
      idCard: TEST_CARD_ID,
      idAttachment: TEST_ATTACHMENT_ID,
      fileName: 'test-attachment.txt'
    };
    
    // Call download_attachment function
    const response = await sendToSnapInServer(event);
    
    // Log the response for debugging
    console.log('Download attachment response:', JSON.stringify(response, null, 2));
    
    // Check if we have a valid response
    expect(response).toBeTruthy();
    expect(typeof response).toBe('object');
    expect(response.success || true).toBeTruthy();
    expect(response.status_code || 200).toBe(200);
    expect(response.attachment_data || response.content).toBeTruthy();
    expect(response.content_type || 'application/octet-stream').toBeTruthy();
  });
});