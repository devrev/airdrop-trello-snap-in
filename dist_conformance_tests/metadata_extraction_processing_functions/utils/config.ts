export const getConfig = () => {
  const requiredEnvVars = [
    'TRELLO_API_KEY',
    'TRELLO_TOKEN',
    'TRELLO_ORGANIZATION_ID'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  }

  return {
    trelloApiKey: process.env.TRELLO_API_KEY!,
    trelloToken: process.env.TRELLO_TOKEN!,
    trelloOrganizationId: process.env.TRELLO_ORGANIZATION_ID!,
    snapInServerUrl: 'http://localhost:8000/handle/sync',
    callbackServerUrl: 'http://localhost:8002',
    devrevServerUrl: 'http://localhost:8003',
    workerDataServerUrl: 'http://localhost:8003/external-worker',
    apiServerUrl: 'http://localhost:8004'
  };
};