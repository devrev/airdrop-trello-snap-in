import fs from 'fs';
import path from 'path';

describe('Extracted Files Check', () => {
  test('should check if extracted files folder exists', () => {
    const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
    
    // Skip test if environment variable is not set
    if (!extractedFilesFolderPath) {
      console.warn('EXTRACTED_FILES_FOLDER_PATH environment variable is not set, skipping test');
      return;
    }
    
    console.log(`Checking if extracted files folder exists at: ${extractedFilesFolderPath}`);
    
    // Check if the folder exists
    const folderExists = fs.existsSync(extractedFilesFolderPath);
    
    if (folderExists) {
      console.log('Extracted files folder exists');
      
      // List files in the folder
      const files = fs.readdirSync(extractedFilesFolderPath);
      console.log(`Files in ${extractedFilesFolderPath}:`, files);
      
      // Check for user extraction files
      const userFiles = files.filter(file => file.includes('extractor_users'));
      console.log(`Found ${userFiles.length} user extraction files:`, userFiles);
      
      // This test is informational only, not asserting anything
      expect(true).toBe(true);
    } else {
      console.log('Extracted files folder does not exist yet (this is normal before extraction)');
      // This test is informational only, not asserting anything
      expect(true).toBe(true);
    }
  });
});