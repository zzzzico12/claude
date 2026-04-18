from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.error

class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/messages':
            length = int(self.headers['Content-Length'])
            body = self.rfile.read(length)
            req = urllib.request.Request(
                'https://api.anthropic.com/v1/messages',
                data=body,
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': self.headers.get('x-api-key', ''),
                    'anthropic-version': self.headers.get('anthropic-version', '2023-06-01'),
                }
            )
            try:
                with urllib.request.urlopen(req) as r:
                    data = r.read()
                    self.send_response(200)
            except urllib.error.HTTPError as e:
                data = e.read()
                self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self._cors()
            self.end_headers()
            self.wfile.write(data)
        else:
            super().do_POST()

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def log_message(self, fmt, *args):
        print(fmt % args)

HTTPServer(('', 8080), Handler).serve_forever()
