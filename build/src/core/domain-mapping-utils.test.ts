import * as path from 'path';

// Mock the fs module
jest.mock('fs', () => {
  return {
    existsSync: jest.fn(),
    readFileSync: jest.fn()
  };
});

// Import the module after mocking fs
import { loadInitialDomainMapping } from './domain-mapping-utils';

// Import fs after mocking
import * as fs from 'fs';

describe('domain-mapping-utils', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should load the initial domain mapping from the first existing path', () => {
    // Mock existsSync to return true for the first path
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return filePath.includes('resources/initial_domain_mapping.json');
    });

    // Mock readFileSync to return a test mapping
    const testMappingString = '{"test": "mapping"}';
    (fs.readFileSync as jest.Mock).mockReturnValue(testMappingString);

    // Call the function
    const result = loadInitialDomainMapping(); 

    // Verify the result
    expect(result).toEqual({ test: "mapping" });
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('resources/initial_domain_mapping.json'),
      'utf8'
    );
  });

  it('should try multiple paths until it finds an existing file', () => {
    // Mock existsSync to return true only for the third path
    (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
      return filePath.includes('dist/resources/initial_domain_mapping.json');
    });

    // Mock readFileSync to return a test mapping
    const testMappingString = '{"test": "mapping"}';
    (fs.readFileSync as jest.Mock).mockReturnValue(testMappingString);

    // Call the function
    const result = loadInitialDomainMapping();

    // Verify the result
    expect(result).toEqual({ test: "mapping" });
    expect(fs.existsSync).toHaveBeenCalledTimes(3); // Should stop after finding the file
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('dist/resources/initial_domain_mapping.json'),
      'utf8'
    );
  });

  it('should return an empty object if no file is found', () => {
    // Mock existsSync to always return false
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Mock console.warn to prevent test output pollution
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Call the function
    const result = loadInitialDomainMapping();

    // Verify the result
    expect(result).toEqual({});
    expect(fs.existsSync).toHaveBeenCalledTimes(4); // Should try all paths
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Initial domain mapping file not found. Using empty object.'
    );

    // Restore console.warn
    consoleWarnSpy.mockRestore();
  });

  it('should handle errors when reading the file', () => {
    // Mock existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock readFileSync to throw an error
    const testError = new Error('Test error');
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    // Mock console.error to prevent test output pollution
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Call the function
    const result = loadInitialDomainMapping();

    // Verify the result
    expect(result).toEqual({});
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading initial domain mapping:',
      testError
    );

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
