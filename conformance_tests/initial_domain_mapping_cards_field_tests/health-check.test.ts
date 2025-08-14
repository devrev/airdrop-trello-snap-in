import { callSnapInFunction } from './utils';

describe('Health Check Function', () => {
  it('should successfully invoke the health check function', async () => {
    const result = await callSnapInFunction('health_check');
    console.log('Health check result:', JSON.stringify(result, null, 2));
    
    expect(result).toBeDefined();
    
    // If result has status and message properties, check them
    if (result && typeof result === 'object') {
      if (result.status) expect(result.status).toBe('success');
      if (result.message) expect(result.message).toBe('Function is operational and can be invoked successfully');
    }
  });
});