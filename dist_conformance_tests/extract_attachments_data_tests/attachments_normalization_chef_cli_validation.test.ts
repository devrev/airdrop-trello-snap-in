import * as fs from 'fs';
import * as path from 'path';
import { setupCallbackServer, sendEventToSnapIn, waitForCallback, cleanupCallbackServer, decompressGzipFile } from './test/http_client';

describe('Attachments Normalization Chef CLI Validation', () => {
  let callbackServer: any;
  const CALLBACK_PORT = 8002;
  const SNAP_IN_URL = 'http://localhost:8000/handle/sync';

  beforeAll(async () => {
    callbackServer = await setupCallbackServer(CALLBACK_PORT);
  });

  afterAll(async () => {
    await cleanupCallbackServer(callbackServer);
  });

  test('attachments_normalization_validation', async () => {
    // Step 1: Load test payload and replace credentials
    const testPayloadPath = path.join(__dirname, 'data_extraction_test.json');
    if (!fs.existsSync(testPayloadPath)) {
      throw new Error(`Test payload file not found: ${testPayloadPath}`);
    }

    const testPayload = JSON.parse(fs.readFileSync(testPayloadPath, 'utf-8'));

    // Replace placeholder credentials with actual values from environment
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloToken = process.env.TRELLO_TOKEN;
    const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!trelloApiKey || !trelloToken || !trelloOrgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    testPayload.payload.connection_data.key = `key=${trelloApiKey}&token=${trelloToken}`;
    testPayload.payload.connection_data.org_id = trelloOrgId;

    // Step 2: Send EXTRACTION_DATA_START event to snap-in server
    await sendEventToSnapIn(SNAP_IN_URL, testPayload);

    // Step 3: Wait for callback event (timeout: 100 seconds)
    const callbackEvent = await waitForCallback(callbackServer, 100000);

    // Step 4: Verify callback event
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Step 5: Verify attachments artifact was uploaded
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
    if (!extractedFilesFolderPath) {
      throw new Error('EXTRACTED_FILES_FOLDER_PATH environment variable is not set');
    }

    if (!fs.existsSync(extractedFilesFolderPath)) {
      throw new Error(`Extracted files folder does not exist: ${extractedFilesFolderPath}`);
    }

    // Step 6: Find the most recent attachments extraction file (compressed)
    const files = fs.readdirSync(extractedFilesFolderPath);
    const attachmentsFiles = files.filter(file => file.includes('extractor_attachments'));

    if (attachmentsFiles.length === 0) {
      throw new Error(`No attachments extraction files found in ${extractedFilesFolderPath}`);
    }

    // Sort by modification time (most recent first) and get the .jsonl file
    const attachmentsFilesWithStats = attachmentsFiles.map(file => ({
      name: file,
      path: path.join(extractedFilesFolderPath, file),
      mtime: fs.statSync(path.join(extractedFilesFolderPath, file)).mtime,
    }));

    attachmentsFilesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    const mostRecentAttachmentsFile = attachmentsFilesWithStats[0];

    // Step 7: Read and parse the attachments file
    if (!fs.existsSync(mostRecentAttachmentsFile.path)) {
      throw new Error(`Attachments file not found: ${mostRecentAttachmentsFile.path}`);
    }

    const attachmentsFileContent = fs.readFileSync(mostRecentAttachmentsFile.path, 'utf-8');
    const attachmentLines = attachmentsFileContent.trim().split('\n').filter(line => line.trim() !== '');
    
    if (attachmentLines.length === 0) {
      throw new Error('No attachments found in the extracted file');
    }

    // Step 8: Validate each attachment
    const errors: string[] = [];
    
    for (let i = 0; i < attachmentLines.length; i++) {
      const lineNumber = i + 1;
      let attachment: any;
      
      try {
        attachment = JSON.parse(attachmentLines[i]);
      } catch (error) {
        errors.push(`Line ${lineNumber}: Invalid JSON - ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
      
      // Validate required fields for NormalizedAttachment
      if (!attachment.id || typeof attachment.id !== 'string') {
        errors.push(`Line ${lineNumber}: Missing or invalid 'id' field (must be string)`);
      }
      
      if (!attachment.url || typeof attachment.url !== 'string') {
        errors.push(`Line ${lineNumber}: Missing or invalid 'url' field (must be string)`);
      } else {
        // Validate URL format
        try {
          new URL(attachment.url);
        } catch (error) {
          errors.push(`Line ${lineNumber}: Invalid URL format in 'url': ${attachment.url}`);
        }
        
        // Validate URL construction according to URLConstructionRule
        // If original URL starts with "https://trello.com", it should be transformed to download URL
        if (attachment.url.startsWith('https://api.trello.com/1/cards/')) {
          // This is a transformed download URL - validate format
          const downloadUrlPattern = /^https:\/\/api\.trello\.com\/1\/cards\/[^/]+\/attachments\/[^/]+\/download\/.+$/;
          if (!downloadUrlPattern.test(attachment.url)) {
            errors.push(`Line ${lineNumber}: Transformed Trello URL has incorrect format: ${attachment.url}`);
          }
        }
      }
      
      if (!attachment.file_name || typeof attachment.file_name !== 'string') {
        errors.push(`Line ${lineNumber}: Missing or invalid 'file_name' field (must be non-empty string)`);
      }
      
      if (!attachment.parent_id || typeof attachment.parent_id !== 'string') {
        errors.push(`Line ${lineNumber}: Missing or invalid 'parent_id' field (must be string)`);
      }
      
      // author_id is optional but if present must be string or null
      if (attachment.hasOwnProperty('author_id')) {
        if (attachment.author_id !== undefined && attachment.author_id !== null && typeof attachment.author_id !== 'string') {
          errors.push(`Line ${lineNumber}: Invalid 'author_id' field (must be string, null, or undefined)`);
        }
      }
    }

    // Step 9: Report validation results
    if (errors.length > 0) {
      throw new Error(
        `Attachments normalization validation failed with ${errors.length} error(s):\n\n` +
        errors.join('\n') +
        `\n\nAttachments file: ${mostRecentAttachmentsFile.path}\n` +
        `\nValidation requirements:\n` +
        `- Required fields: id, url, file_name, parent_id\n` +
        `- Field types: id/url/file_name/parent_id must be strings\n` +
        `- Optional field: author_id (string, null, or undefined)\n` +
        `- url must be a valid URL string\n` +
        `- file_name must be a non-empty string\n` +
        `- parent_id must be a string (card ID reference)\n` +
        `- author_id (if present) must be string, null, or undefined (user ID reference)\n` +
        `- URL construction must follow URLConstructionRule:\n` +
        `  * URLs starting with 'https://trello.com' should be transformed to:\n` +
        `    'https://api.trello.com/1/cards/{idCard}/attachments/{idAttachment}/download/{fileName}'\n` +
        `  * Other URLs should remain unchanged\n` +
          `\nCommon normalization issues:\n` +
          `- Missing required fields (id, url, file_name, parent_id)\n` +
          `- Incorrect field types (id/url/file_name/parent_id must be strings)\n` +
          `- Invalid URL format in data.url\n` +
          `- Incorrect URL construction for Trello URLs (should be transformed to download URLs)\n` +
          `- Missing file_name in data object\n` +
          `- Invalid reference values in parent_id or author_id`
      );
    }
    
    // Validation succeeded
    expect(errors.length).toBe(0);
    expect(attachmentLines.length).toBeGreaterThan(0);
  }, 120000); // 120 second timeout
});