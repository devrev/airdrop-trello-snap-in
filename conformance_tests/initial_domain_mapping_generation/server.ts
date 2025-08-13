import express from 'express';
import bodyParser from 'body-parser';

// Create a simple callback server for testing
export function startCallbackServer(port: number = 8002): express.Application {
  const app = express();
  app.use(bodyParser.json());
  
  app.post('/callback', (req, res) => {
    console.log('Received callback:', req.body);
    res.status(200).send({ status: 'ok' });
  });

  const server = app.listen(port, () => {
    console.log(`Callback server listening on port ${port}`);
  });

  // Add a close method to the app for test cleanup
  (app as any).close = () => {
    server.close();
  };

  return app;
}