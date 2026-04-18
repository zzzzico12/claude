from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.error
import re

MAX_BODY = 512 * 1024  # 512KB
ALLOWED_ORIGIN = 'http://localhost:8080'
API_KEY_RE = re.compile(r'^sk-ant-[A-Za-z0-9\-_]{20,}$')

class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        if not self._check_origin():
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if not self._check_origin():
            self._error(403, 'Forbidden')
            return
        if self.path == '/api/messages':
            try:
                length = int(self.headers.get('Content-Length', 0))
            except ValueError:
                self._error(400, 'Bad Content-Length')
                return
            if length <= 0 or length > MAX_BODY:
                self._error(413, 'Request too large')
                return

            api_key = self.headers.get('x-api-key', '')
            if not API_KEY_RE.match(api_key):
                self._error(401, 'Invalid API key format')
                return

            body = self.rfile.read(length)
            req = urllib.request.Request(
                'https://api.anthropic.com/v1/messages',
                data=body,
                headers={
                    'Content-Type': 'application/json',
                    'x-api-key': api_key,
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

    def _check_origin(self):
        origin = self.headers.get('Origin', '')
        return origin == ALLOWED_ORIGIN or origin == ''

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def _error(self, code, msg):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._cors()
        self.end_headers()
        self.wfile.write(f'{{"error":{{"message":"{msg}"}}}}'.encode())

    def log_message(self, fmt, *args):
        print(fmt % args)

HTTPServer(('127.0.0.1', 8080), Handler).serve_forever()
