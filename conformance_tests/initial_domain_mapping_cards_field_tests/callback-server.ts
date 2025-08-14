import express from 'express';
import bodyParser from 'body-parser';

// Create a simple Express server for callbacks
const app = express();
app.use(bodyParser.json());

// Store received callbacks for testing
const receivedCallbacks: any[] = [];

// Endpoint to receive callbacks
app.post('/callback', (req, res) => {
  console.log('Received callback:', req.body);
  receivedCallbacks.push(req.body);
  res.status(200).send({ status: 'success' });
});

// Endpoint to retrieve received callbacks
app.get('/callbacks', (req, res) => {
  res.status(200).send(receivedCallbacks);
});

// Endpoint to clear received callbacks
app.post('/clear-callbacks', (req, res) => {
  receivedCallbacks.length = 0;
  res.status(200).send({ status: 'success' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'up' });
});

// Start the server
const port = 8002;
const server = app.listen(port, () => {
  console.log(`Callback server listening on port ${port}`);
});

// Export for testing
export { server, receivedCallbacks };