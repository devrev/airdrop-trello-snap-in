import axios from 'axios';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CARD_ID = '688725fdf26b3c50430cae23'; // Test card ID as specified in requirements
const EXPECTED_ATTACHMENT_NAME = 'Result from test.com';
const EXPECTED_ATTACHMENT_COUNT = 1;

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Check required environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  process.exit(1);
}

// Create a basic event object for testing
const createTestEvent = (cardId: string = CARD_ID) => {
  return {
    payload: {
      card_id: cardId,
      connection_data: {
        org_id: TRELLO_ORGANIZATION_ID,
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
      }
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_card_attachments',
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
};

describe('Acceptance Test: fetch_card_attachments Function', () => {
  test('should return exactly 1 attachment with name "Result from test.com"', async () => {
    console.log(`Starting acceptance test for card ID: ${CARD_ID}`);
    
    try {
      // Send request to the Snap-In Server
      console.log('Sending request to Snap-In Server...');
      const response = await axios.post(SNAP_IN_SERVER_URL, createTestEvent());
      
      // Verify response status
      expect(response.status).toBe(200);
      console.log('Received 200 OK response from server');
      
      // Verify function result status
      expect(response.data.function_result.status).toBe('success');
      console.log('Function execution was successful');
      
      // Verify attachments array exists
      expect(response.data.function_result).toHaveProperty('attachments');
      expect(Array.isArray(response.data.function_result.attachments)).toBe(true);
      
      // Verify attachment count
      const attachments = response.data.function_result.attachments;
      console.log(`Found ${attachments.length} attachments, expected ${EXPECTED_ATTACHMENT_COUNT}`);
      expect(attachments.length).toBe(EXPECTED_ATTACHMENT_COUNT);
      
      // Verify attachment name
      if (attachments.length > 0) {
        const attachment = attachments[0];
        console.log(`Attachment name: "${attachment.name}", expected: "${EXPECTED_ATTACHMENT_NAME}"`);
        expect(attachment.name).toBe(EXPECTED_ATTACHMENT_NAME);
        
        // Log additional attachment details for debugging
        console.log('Attachment details:', {
          id: attachment.id,
          url: attachment.url,
          mime_type: attachment.mime_type,
          date_created: attachment.date_created
        });
      }
    } catch (error) {
      // Detailed error logging
      console.error('Acceptance test failed with error:');
      if (axios.isAxiosError(error)) {
        console.error('HTTP Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      } else {
        console.error('Unexpected error:', error);
      }
      throw error;
    }
  });
});