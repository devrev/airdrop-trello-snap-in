import { CallbackServer, loadTestPayload, invokeSnapIn, findMostRecentFile } from './helpers/test-helpers';
import * as path from 'path';
import * as fs from 'fs';

describe('Labels Data Extraction - Normalization Validation', () => {
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

  test('should validate labels data extraction and normalization', async () => {
    // Load test payload with actual credentials
    const payload = loadTestPayload('data_extraction_test.json');

    // Invoke the extraction function
    await invokeSnapIn(payload);

    // Wait for the callback event indicating extraction completion
    const callbackEvent = await callbackServer.waitForEvent('EXTRACTION_DATA_DONE', 60000);

    // Verify extraction completed successfully
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Get the extracted files folder path from environment
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
    if (!extractedFilesFolderPath) {
      throw new Error('EXTRACTED_FILES_FOLDER_PATH environment variable is not set');
    }

    // Find the most recent labels data file
    const labelsDataFile = findMostRecentFile(extractedFilesFolderPath, 'extractor_labels');
    if (!labelsDataFile) {
      throw new Error(
        `Labels data file not found in ${extractedFilesFolderPath}. ` +
        `Available files: ${fs.existsSync(extractedFilesFolderPath) ? fs.readdirSync(extractedFilesFolderPath).join(', ') : 'folder does not exist'}`
      );
    }

    console.log(`Found labels data file: ${labelsDataFile}`);

    // Read and parse the labels data file (JSONL format)
    const fileContent = fs.readFileSync(labelsDataFile, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim() !== '');
    
    // Verify at least one label was extracted
    expect(lines.length).toBeGreaterThan(0);

    console.log(`Found ${lines.length} labels in the extracted file`);

    // Validate each label
    const validHexColors = [
      '#008000', '#0000FF', '#FFA500', '#800080', '#FF0000', '#FFFF00',
      '#000000', '#FFFFFF', '#808080', '#A52A2A', '#FFC0CB', '#00FFFF',
      '#FF00FF', '#00FF00', '#000080', '#800000', '#808000', '#008080',
      '#C0C0C0'
    ];

    for (let i = 0; i < lines.length; i++) {
      const label = JSON.parse(lines[i]);

      // Validate required top-level fields
      expect(label).toHaveProperty('id');
      expect(label).toHaveProperty('created_date');
      expect(label).toHaveProperty('modified_date');
      expect(label).toHaveProperty('data');

      // Validate field types
      expect(typeof label.id).toBe('string');
      expect(typeof label.created_date).toBe('string');
      expect(typeof label.modified_date).toBe('string');
      expect(typeof label.data).toBe('object');

      // Validate created_date and modified_date are valid ISO 8601 timestamps
      expect(new Date(label.created_date).toISOString()).toBe(label.created_date);
      expect(new Date(label.modified_date).toISOString()).toBe(label.modified_date);

      // Validate data object structure
      expect(label.data).toHaveProperty('id');
      expect(label.data).toHaveProperty('name');
      expect(label.data).toHaveProperty('color');
      expect(label.data).toHaveProperty('description');

      // Validate data field types
      expect(typeof label.data.id).toBe('string');
      expect(typeof label.data.name).toBe('string');
      expect(typeof label.data.color).toBe('string');
      expect(Array.isArray(label.data.description)).toBe(true);

      // Validate id matches between top-level and data
      expect(label.data.id).toBe(label.id);

      // Validate color is a valid hex code
      expect(label.data.color).toMatch(/^#[0-9A-F]{6}$/);
      expect(validHexColors).toContain(label.data.color);

      // Validate description is a non-empty array of strings (rich text format)
      expect(label.data.description.length).toBeGreaterThan(0);
      for (const line of label.data.description) {
        expect(typeof line).toBe('string');
      }

      // Validate name format
      if (label.data.name === '') {
        // Empty names should not occur after normalization
        fail(`Label ${label.id} has empty name after normalization`);
      }

      // If name starts with "label-", it should be followed by a color name
      if (label.data.name.startsWith('label-')) {
        const colorName = label.data.name.substring(6);
        expect(colorName.length).toBeGreaterThan(0);
      }

      // Validate description matches name (as per specification)
      expect(label.data.description).toEqual([label.data.name]);

      console.log(`Validated label ${i + 1}/${lines.length}: ${label.data.name} (${label.data.color})`);
    }

    console.log(`Successfully validated all ${lines.length} labels`);
  }, 120000);
});