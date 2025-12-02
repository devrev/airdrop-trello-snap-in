import socket
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import ssl
from urllib.parse import urlparse
import datetime
import email.utils
import urllib.request, urllib.error

RATE_LIMIT_DELAY = 3  # seconds - Time to wait before retrying

class RateLimiterState:
    """A thread-safe class to manage the global rate limiting state."""
    def __init__(self):
        self.lock = threading.Lock()
        self.rate_limiting_active = False

    def start_rate_limiting(self):
        with self.lock:
            self.rate_limiting_active = True

    def end_rate_limiting(self):
        with self.lock:
            self.rate_limiting_active = False

    def is_rate_limiting_active(self):
        with self.lock:
            return self.rate_limiting_active

rate_limiter_state = RateLimiterState()

class ProxyHandler(BaseHTTPRequestHandler):
    """
    This proxy handler uses the high-level http.server module to robustly handle
    HTTP requests. It specifically handles CONNECT requests for HTTPS tunneling
    and our custom /start_rate_limiting and /end_rate_limiting endpoints.
    """
    server_version = "rate-limit-proxy/0.1"

    def _check_rate_limit(self, method_name):
        if rate_limiter_state.is_rate_limiting_active():
            print(f"Rate limiting is active. Blocking request with 429 from {method_name} method")
            self.send_error(429, "Too Many Requests")
            return True
        return False

    def do_CONNECT(self):
        """Handles CONNECT requests to establish an HTTPS tunnel."""
        if self._check_rate_limit('do_CONNECT'):
            return

        self.send_response(200, 'Connection Established')
        self.end_headers()

        try:
            host, port_str = self.path.split(':')
            port = int(port_str)
        except ValueError:
            self.connection.close()
            return
        
        try:
            remote_socket = socket.create_connection((host, port), timeout=10)
        except socket.error:
            self.connection.close()
            return

        self.connection.setblocking(0)
        remote_socket.setblocking(0)

        print(f"Tunneling CONNECT request to {self.path}")
        while True:
            import select
            r, w, x = select.select([self.connection, remote_socket], [], [], 5)
            if not r:
                break
            
            if self.connection in r:
                data = self.connection.recv(8192)
                if not data:
                    break
                if remote_socket.send(data) <= 0:
                    break
            
            if remote_socket in r:
                data = remote_socket.recv(8192)
                if not data:
                    break
                if self.connection.send(data) <= 0:
                    break
        
        remote_socket.close()
        self.connection.close()

    def _proxy_request(self, method):
        if self._check_rate_limit(f'do_{method}'):
            return

        try:
            # We must remove the Host header from the original request, as it
            # points to the proxy itself. urllib will add the correct Host.
            req_headers = dict(self.headers)
            if 'Host' in req_headers:
                del req_headers['Host']
            
            # Create a proxy handler that explicitly uses no proxies, to avoid
            # the server trying to proxy itself.
            proxy_handler = urllib.request.ProxyHandler({})
            opener = urllib.request.build_opener(proxy_handler)

            body = None
            if method in ('POST', 'PUT', 'PATCH'):
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)

            # Create and send the request to the target server
            req = urllib.request.Request(self.path, data=body, headers=req_headers, method=method)
            with opener.open(req, timeout=10) as response:
                # Send the response status and headers back to the original client
                self.send_response(response.status, response.reason)
                for key, value in response.getheaders():
                    # Do not forward hop-by-hop headers
                    if key.lower() not in ('transfer-encoding', 'connection'):
                        self.send_header(key, value)
                self.end_headers()

                # Stream the response body back to the original client
                self.wfile.write(response.read())

        except urllib.error.HTTPError as e:
            # If the upstream server returned an HTTP error (like 401, 404, etc.),
            # we should propagate that error back to the original client.
            self.send_response(e.code, e.reason)
            for key, value in e.headers.items():
                if key.lower() not in ('transfer-encoding', 'connection'):
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(e.read())

        except Exception as e:
            self.send_error(502, f"Proxying {method} request failed: {e}")

    def do_GET(self):
        """
        Handles direct GET requests that are sent to the proxy.
        This is necessary for clients that use non-CONNECT proxying for GET.
        """
        self._proxy_request('GET')

    def do_PUT(self):
        """
        Handles direct PUT requests that are sent to the proxy.
        This is necessary for clients that use non-CONNECT proxying for PUT.
        """
        self._proxy_request('PUT')

    def do_POST(self):
        """
        Handles the control endpoints for starting and stopping rate limiting,
        or proxies POST requests.
        """
        if self.path == '/start_rate_limiting':
            rate_limiter_state.start_rate_limiting()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'rate limiting started'}).encode('utf-8'))
            print("Rate limiting started.")
            return
        elif self.path == '/end_rate_limiting':
            rate_limiter_state.end_rate_limiting()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'rate limiting ended'}).encode('utf-8'))
            print("Rate limiting ended.")
            return

        self._proxy_request('POST')

    def do_PATCH(self):
        """
        Handles direct PATCH requests that are sent to the proxy.
        This is necessary for clients that use non-CONNECT proxying for PATCH.
        """
        self._proxy_request('PATCH')

    def do_DELETE(self):
        """
        Handles direct DELETE requests that are sent to the proxy.
        This is necessary for clients that use non-CONNECT proxying for DELETE.
        """
        self._proxy_request('DELETE')

    def send_error(self, code, message=None):
        """Overrides the default send_error to add custom headers for 429."""
        if code == 429:
            self.log_error("Code %d, message %s", code, message)
            self.send_response(429, "Too Many Requests")
            self.send_header('Content-type', 'application/json')
            
            retry_after_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=RATE_LIMIT_DELAY)
            retry_after_str = email.utils.formatdate(
                timeval=retry_after_time.timestamp(),
                localtime=False,
                usegmt=True
            )
            self.send_header('Retry-After', retry_after_str)
            
            self.end_headers()
            self.wfile.write(json.dumps({'detail': 'Rate limit exceeded'}).encode('utf-8'))
            print("Finished blocking rate limiting request with 429.")
        else:
            super().send_error(code, message)

class ThreadingHTTPServer(HTTPServer):
    """Enable multi-threading for the HTTPServer."""
    daemon_threads = False

def main():
    HOST, PORT = "localhost", 8004
    
    try:
        server = ThreadingHTTPServer((HOST, PORT), ProxyHandler)
        print(f"Starting proxy server on {HOST}:{PORT}")
        server.serve_forever()
    except Exception as e:
        print(f"Could not start proxy server: {e}")
        # The script `run_devrev_snapin_conformance_tests.sh` checks for exit code 69.
        import sys
        sys.exit(69)

if __name__ == "__main__":
    main()
