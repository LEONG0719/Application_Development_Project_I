# AI Extraction Service

This project currently uses a Python venv created by MSYS Python:

```txt
C:\msys64\ucrt64\bin\python.exe
```

Because of that, the venv folder is:

```txt
.venv\bin
```

not the usual Windows:

```txt
.venv\Scripts
```

## Run From Project Root

```powershell
npm run dev:ai
```

## Run From ai_service

```powershell
cd D:\AP1\Application_Development_Project_I\ai_service
.\.venv\bin\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Activate The Venv

```powershell
cd D:\AP1\Application_Development_Project_I\ai_service
.\.venv\bin\Activate.ps1
```

Then run:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Test

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```
