import sys
import os

# Assuming this script is located in the backend directory
# and that this is the directory you want to add to sys.path
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

from main import app
from a2wsgi import ASGIMiddleware

# PythonAnywhere looks for a variable called "application"
# by default. We wrap our FastAPI "app" into ASGIMiddleware
# which gives us a WSGI-compatible application object.
application = ASGIMiddleware(app)
