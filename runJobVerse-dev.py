#!flask/bin/python
from app_JobVerse import app_Isc
from livereload import Server
import os

app_Isc.debug = True

server = Server(app_Isc.wsgi_app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(BASE_DIR, 'app_JobVerse/')
server.watch(APP_DIR + 'templates/')
server.watch(APP_DIR + 'static/')
server.serve(port=5500)

# app_Isc.run(debug=True)