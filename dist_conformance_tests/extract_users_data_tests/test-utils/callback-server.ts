/**
 * Utility for setting up and managing callback server for testing
 */

import * as http from 'http';

export interface CallbackEvent {
  event_type: string;
  event_data?: any;
  [key: string]: any;
}

export class CallbackServer {
  private server: http.Server | null = null;
  private receivedEvents: CallbackEvent[] = [];
  private eventPromise: Promise<CallbackEvent> | null = null;
  private eventResolve: ((event: CallbackEvent) => void) | null = null;

  /**
   * Start the callback server on the specified port
   */
  async start(port: number = 8002): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const event = JSON.parse(body);
              console.log('[CallbackServer] Received event:', JSON.stringify(event, null, 2));
              this.receivedEvents.push(event);
              
              // Resolve waiting promise if exists
              if (this.eventResolve) {
                this.eventResolve(event);
                this.eventResolve = null;
                this.eventPromise = null;
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('[CallbackServer] Error parsing event:', error);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      this.server.on('error', (error) => {
        reject(error);
      });

      this.server.listen(port, () => {
        console.log(`[CallbackServer] Started on port ${port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the callback server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[CallbackServer] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Wait for the next event with timeout
   */
  async waitForEvent(timeoutMs: number = 60000): Promise<CallbackEvent> {
    // If event already received, return it
    if (this.receivedEvents.length > 0) {
      return this.receivedEvents[this.receivedEvents.length - 1];
    }

    // Create promise to wait for event
    this.eventPromise = new Promise((resolve) => {
      this.eventResolve = resolve;
    });

    // Race between event promise and timeout
    const timeoutPromise = new Promise<CallbackEvent>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout waiting for callback event after ${timeoutMs}ms. No events received.`));
      }, timeoutMs);
    });

    return Promise.race([this.eventPromise, timeoutPromise]);
  }

  /**
   * Get all received events
   */
  getReceivedEvents(): CallbackEvent[] {
    return [...this.receivedEvents];
  }

  /**
   * Clear received events
   */
  clearEvents(): void {
    this.receivedEvents = [];
  }
}