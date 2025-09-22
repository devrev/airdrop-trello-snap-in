import { createBaseEvent, sendToSnapInServer } from './test-utils';

describe('download_attachment function', () => {
  // Test case 1: Basic invocation test
  test('should be invocable with valid parameters', async () => {
    // Arrange
    const event = createBaseEvent();
    event.input_data.global_values = {
      idCard: '688725db990240b77167efef',
      idAttachment: '68c2be83c413a1889bde83df',
      fileName: 'test-file.txt'
    };

    // Act
    const response = await sendToSnapInServer(event);

    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
  });

  // Test case 2: Missing parameters test
  test('should return error when required parameters are missing', async () => {
    // Test missing idCard
    const eventMissingCard = createBaseEvent();
    eventMissingCard.input_data.global_values = {
      idAttachment: '68c2be83c413a1889bde83df',
      fileName: 'test-file.txt'
    };
    
    const responseMissingCard = await sendToSnapInServer(eventMissingCard);
    expect(responseMissingCard.function_result).toBeDefined();
    expect(responseMissingCard.function_result.success).toBe(false);
    expect(responseMissingCard.function_result.message).toContain('Missing idCard parameter');

    // Test missing idAttachment
    const eventMissingAttachment = createBaseEvent();
    eventMissingAttachment.input_data.global_values = {
      idCard: '688725db990240b77167efef',
      fileName: 'test-file.txt'
    };
    
    const responseMissingAttachment = await sendToSnapInServer(eventMissingAttachment);
    expect(responseMissingAttachment.function_result).toBeDefined();
    expect(responseMissingAttachment.function_result.success).toBe(false);
    expect(responseMissingAttachment.function_result.message).toContain('Missing idAttachment parameter');

    // Test missing fileName
    const eventMissingFileName = createBaseEvent();
    eventMissingFileName.input_data.global_values = {
      idCard: '688725db990240b77167efef',
      idAttachment: '68c2be83c413a1889bde83df'
    };
    
    const responseMissingFileName = await sendToSnapInServer(eventMissingFileName);
    expect(responseMissingFileName.function_result).toBeDefined();
    expect(responseMissingFileName.function_result.success).toBe(false);
    expect(responseMissingFileName.function_result.message).toContain('Missing fileName parameter');
  });

  // Test case 3: Successful download test
  test('should successfully download an attachment', async () => {
    // Arrange
    const event = createBaseEvent();
    event.input_data.global_values = {
      idCard: '688725db990240b77167efef',
      idAttachment: '68c2be83c413a1889bde83df',
      fileName: 'test-file.txt'
    };

    // Act
    const response = await sendToSnapInServer(event);

    // Assert
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.status_code).toBe(200);
    expect(response.function_result.api_delay).toBeDefined();
    expect(response.function_result.message).toContain('Successfully downloaded attachment');
    expect(response.function_result.attachment_data).toBeDefined();
    expect(response.function_result.content_type).toBeDefined();
    
    // Verify the attachment data is a base64 string
    expect(typeof response.function_result.attachment_data).toBe('string');
    // Try to decode the base64 string to verify it's valid
    expect(() => Buffer.from(response.function_result.attachment_data, 'base64')).not.toThrow();
  });
});