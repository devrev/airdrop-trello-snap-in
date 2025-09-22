import { createBaseEvent, sendToSnapInServer } from './test-utils';

describe('download_attachment function - Acceptance Test', () => {
  test('should successfully download an attachment with specified parameters', async () => {
    // Arrange
    const event = createBaseEvent();
    
    // Set the specific parameters required by the acceptance test
    event.input_data.global_values = {
      idCard: '688725db990240b77167efef',
      idAttachment: '68c2be83c413a1889bde83df',
      fileName: 'temporary-file-name.png'
    };

    // Act
    const response = await sendToSnapInServer(event);

    // Assert
    // Check overall response structure
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Check function result details
    const result = response.function_result;
    expect(result.success).toBe(true);
    expect(result.status_code).toBe(200);
    expect(result.api_delay).toBeDefined();
    expect(result.message).toContain('Successfully downloaded attachment');
    
    // Check attachment data
    expect(result.attachment_data).toBeDefined();
    expect(typeof result.attachment_data).toBe('string');
    expect(result.content_type).toBeDefined();
    
    // Verify the attachment data is a valid base64 string
    let isValidBase64 = true;
    try {
      const buffer = Buffer.from(result.attachment_data, 'base64');
      // Additional check: a valid image should have some minimum size
      expect(buffer.length).toBeGreaterThan(0);
    } catch (error) {
      isValidBase64 = false;
      console.error('Invalid base64 data:', error);
    }
    expect(isValidBase64).toBe(true);
    
    // Log useful information for debugging
    console.log(`Attachment download successful:
      - Content type: ${result.content_type}
      - Attachment size: ${Buffer.from(result.attachment_data, 'base64').length} bytes
      - File name: temporary-file-name.png
    `);
  });
});