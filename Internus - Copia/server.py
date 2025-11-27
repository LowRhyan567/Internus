from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

porta = 8001

os.chdir(r'c:\Users\rhyan\Downloads\Projetos\Internus - Copia')
server = HTTPServer(('localhost', porta), NoCacheHTTPRequestHandler)
print(f'🎮 Servidor rodando em http://localhost:{porta}')
server.serve_forever()
