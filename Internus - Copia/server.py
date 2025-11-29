from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json
from urllib.parse import parse_qs
from datetime import datetime

class GameHTTPRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_request(self, code='-', size='-'):
        pass
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/mensagem':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                mensagem = data.get('mensagem', '').strip()
                
                if mensagem:
                    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    print('\n' + '='*60)
                    print(f'💬 "{mensagem}"')
                    print('='*60 + '\n')
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'success'}).encode())
                else:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'status': 'error', 'message': 'Mensagem vazia'}).encode())
                    
            except Exception as e:
                print(f'Erro ao processar mensagem: {e}')
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

porta = 8001

os.chdir(r'c:\Users\rhyan\Downloads\Projetos\Internus - Copia')
server = HTTPServer(('localhost', porta), GameHTTPRequestHandler)
print(f"{porta}. Você chegou cedo.")
server.serve_forever()
