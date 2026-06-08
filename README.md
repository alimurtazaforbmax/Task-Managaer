# Task Manager

Internal task and bug tracking for developers, QA, PM, and AI teams. Built with **Django + DRF** backend and **React + TypeScript** frontend.

## Features

- Projects with members and document uploads
- Tasks and bugs with separate status workflows
- Assign to users or departments
- Comments, activity logs, notifications
- Bug reject flow with mandatory reason (QA ↔ dev)
- Image/video attachments on bugs and tasks
- Time tracking per task/bug
- JWT authentication and role-based access

## Quick start (local)

### Backend

```powershell
cd "c:\Users\cw\Desktop\Task Manager"
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

API: http://127.0.0.1:8000/api/docs/

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### Demo accounts

| User | Password | Role |
|------|----------|------|
| admin | admin123 | Admin |
| pm | demo123 | Project Manager |
| dev | demo123 | Developer |
| qa | demo123 | QA |

## Docker

```powershell
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## Project structure

```
backend/          Django + DRF API
frontend/         React + Vite + Tailwind
docker-compose.yml
requirements.txt
```

## API response format

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```
