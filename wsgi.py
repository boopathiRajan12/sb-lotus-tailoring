"""
WSGI entry point for PythonAnywhere deployment.
PythonAnywhere uses this file to run your Flask app.
"""
from app import create_app

application = create_app()
