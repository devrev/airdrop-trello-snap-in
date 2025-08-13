import express from 'express';
import bodyParser from 'body-parser';

// Create a simple callback server for testing
export function createCallbackServer(port = 8002) {
  const app = express();
  app.use(bodyParser.json());
  
  const callbacks: Record<string, any[]> = {};
  
  // Endpoint to receive callbacks
  app.post('/callback/:id', (req, res) => {
    const { id } = req.params;
    if (!callbacks[id]) {
      callbacks[id] = [];
    }
    callbacks[id].push(req.body);
    res.status(200).send({ success: true });
  });
  
  // Start the server
  const server = app.listen(port, () => {
    console.log(`Callback server listening on port ${port}`);
  });
  
  // Function to get callbacks for a specific ID
  const getCallbacks = (id: string) => callbacks[id] || [];
  
  // Function to clear callbacks
  const clearCallbacks = (id?: string) => {
    if (id) {
      delete callbacks[id];
    } else {
      Object.keys(callbacks).forEach(key => delete callbacks[key]);
    }
  };
  
  // Function to stop the server
  const stop = () => {
    server.close();
  };
  
  return {
    getCallbacks,
    clearCallbacks,
    stop
  };
}