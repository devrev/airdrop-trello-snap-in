import { CallbackServer, sendEventToSnapIn, loadTestPayload, replaceCredentials, 
         getExtractedFilesFolder, findMostRecentFile, getChefCliPath, getSampleData } from './test-helpers';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Comments Normalization Chef CLI Validation', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    callbackServer = new CallbackServer(8002);
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('comments_normalization_chef_cli_validation', async () => {
    // Load test payload and replace credentials
    const payload = loadTestPayload('data_extraction_test.json');
    const payloadWithCredentials = replaceCredentials(payload);

    // Send EXTRACTION_DATA_START event to snap-in server
    await sendEventToSnapIn(payloadWithCredentials);

    // Wait for callback event with timeout of 100 seconds
    const callbackEvent = await callbackServer.waitForEvent(100000);

    // Verify that event_type is 'EXTRACTION_DATA_DONE'
    const allEvents = callbackServer.getEvents();
    expect(allEvents.length).toBe(1);

    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Get extracted files folder
    const extractedFilesFolder = getExtractedFilesFolder();

    // Find the most recent comments extraction file
    const commentsFile = findMostRecentFile(extractedFilesFolder, 'extractor_comments');

    // Verify that the extracted comments file exists
    expect(fs.existsSync(commentsFile)).toBe(true);

    // Get Chef CLI path
    const chefCliPath = getChefCliPath();

    // Copy external-domain-metadata.json to test directory from build folder
    const metadataSourcePath = path.join(__dirname, '../../build/src/functions/extraction/external-domain-metadata.json');
    
    if (!fs.existsSync(metadataSourcePath)) {
      throw new Error(
        `External domain metadata file not found.\n` +
        `Expected location: ${metadataSourcePath}\n` +
        `Please ensure the build folder contains the external-domain-metadata.json file.`
      );
    }
    
    const metadataCopyPath = path.join(__dirname, 'external-domain-metadata-copy.json');
    fs.copyFileSync(metadataSourcePath, metadataCopyPath);

    // Execute Chef CLI validation command
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    try {
      const command = `${chefCliPath} validate-data -m ${metadataCopyPath} -r comments < ${commentsFile}`;
      stdout = execSync(command, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error: any) {
      exitCode = error.status !== undefined ? error.status : 1;
      stdout = error.stdout || '';
      stderr = error.stderr || '';
    }

    // Clean up metadata copy
    if (fs.existsSync(metadataCopyPath)) {
      fs.unlinkSync(metadataCopyPath);
    }

    // If validation fails, provide detailed error message
    if (exitCode !== 0 || stdout.trim() !== '' || stderr.trim() !== '') {
      const sampleData = getSampleData(commentsFile, 3);
      const errorMessage = `
Chef CLI Validation Failed
==========================

Command Executed:
"${chefCliPath}" validate-data -m ${metadataCopyPath} -r comments < ${commentsFile}

Exit Code: ${exitCode}

STDOUT:
${stdout}

STDERR:
${stderr}

Sample of Extracted Data (first 3 lines):
${sampleData}

Expected Normalization Requirements for Comments:
- Required top-level fields: id, created_date, modified_date, data
- Field types must match schema: id/created_date/modified_date are strings, data is object
- Timestamps must be in RFC3339 format
- data object must contain: id, body, parent_object_id, created_by_id, modified_date, grandparent_object_id, grandparent_object_type, creator_display_name, parent_object_type
- body field must be array of strings (rich text format), not plain string
- parent_object_id must reference a valid card ID
- created_by_id must reference a valid user ID
- grandparent_object_type must be fixed value 'board'
- parent_object_type must be fixed value 'issue'
- All reference fields must contain valid string values

Common Normalization Issues:
1. body field is a plain string instead of array of strings (rich text format)
2. Timestamps are not in RFC3339 format
3. Required fields are missing from data object
4. Field types do not match schema (e.g., number instead of string)
5. Fixed value fields (grandparent_object_type, parent_object_type) have incorrect values
6. Rich text conversion not applied (empty lines not filtered out)
`;
      throw new Error(errorMessage);
    }

    // Assert that validation succeeded
    expect(stdout.trim()).toBe('');
    expect(stderr.trim()).toBe('');
    expect(exitCode).toBe(0);
  }, 120000);
});