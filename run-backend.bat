@echo off
cd /d "%~dp0backend"
"%~dp0venv\Scripts\python.exe" manage.py runserver 0.0.0.0:8001
