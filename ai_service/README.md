# AI Extraction Service

This project uses a Python virtual environment under:

```txt
.venv\Scripts
```

## Run From Project Root

```powershell
npm run dev:ai
```

## Environment

The AI service owns its own environment config in `ai_service/.env`:

```txt
AI_SERVICE_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

For deployment, add the deployed frontend URL to this comma-separated list.

## Run From ai_service

```powershell
cd D:\AP1\Application_Development_Project_I\ai_service
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Activate The Venv

```powershell
cd D:\AP1\Application_Development_Project_I\ai_service
.\.venv\Scripts\Activate.ps1
```

Then run:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Test

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```
