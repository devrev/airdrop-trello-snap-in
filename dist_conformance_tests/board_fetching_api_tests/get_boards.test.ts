import { callSnapInFunction } from './utils';

describe('get_boards Function Tests', () => {
  // Test 1: Basic test - Function exists and can be called
  test('should be able to call the get_boards function', async () => {
    const result = await callSnapInFunction('get_boards');
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  // Test 2: Simple test - Response structure
  test('should return the expected response structure', async () => {
    const result = await callSnapInFunction('get_boards');
    
    // Check response structure
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBeDefined();
    expect(result.function_result.message).toBeDefined();
    
    // Check success status
    expect(result.function_result.status).toBe('success');
    expect(result.function_result.message).toContain('Successfully fetched');
  });

  // Test 3: Complex test - Boards data validation
  test('should fetch boards with correct data structure', async () => {
    const result = await callSnapInFunction('get_boards');
    
    // Ensure we have boards data
    expect(result.function_result.boards).toBeDefined();
    expect(Array.isArray(result.function_result.boards)).toBe(true);
    
    // If boards were fetched, validate their structure
    if (result.function_result.boards.length > 0) {
      const firstBoard = result.function_result.boards[0];
      
      // Check required board properties
      expect(firstBoard.id).toBeDefined();
      expect(firstBoard.name).toBeDefined();
      expect(firstBoard.url).toBeDefined();
      expect(typeof firstBoard.closed).toBe('boolean');
      
      // These properties might be null/undefined but should exist
      expect('description' in firstBoard).toBe(true);
      expect('organization_id' in firstBoard).toBe(true);
      expect('last_activity_date' in firstBoard).toBe(true);
    }
  });
});