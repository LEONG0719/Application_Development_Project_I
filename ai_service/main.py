from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from extractor import (
    extract_bayaran_from_pdf,
    extract_kuarters_from_xlsx,
    extract_penghuni_from_xlsx,
    extract_tunggakan_from_xlsx,
)


app = FastAPI(
    title="Kuarters AI Extraction Service",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):30\d\d",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/extract/penghuni")
async def extract_penghuni(
    file: UploadFile = File(...),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Sila muat naik fail .xlsx sahaja.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_penghuni_from_xlsx(file_bytes, limit=limit)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data penghuni: {error}",
        ) from error


@app.post("/extract/bayaran")
async def extract_bayaran(
    file: UploadFile = File(...),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sila muat naik fail .pdf sahaja.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_bayaran_from_pdf(file_bytes, limit=limit)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data bayaran: {error}",
        ) from error


@app.post("/extract/kuarters")
async def extract_kuarters(
    file: UploadFile = File(...),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Sila muat naik fail .xlsx sahaja.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_kuarters_from_xlsx(file_bytes, limit=limit)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data kuarters: {error}",
        ) from error


@app.post("/extract/tunggakan")
async def extract_tunggakan(
    file: UploadFile = File(...),
    limit: int | None = Query(default=None, ge=1, le=1000),
) -> dict:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Sila muat naik fail .xlsx sahaja.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Fail kosong.")

    try:
        return extract_tunggakan_from_xlsx(file_bytes, limit=limit)
    except Exception as error:
        raise HTTPException(
            status_code=422,
            detail=f"Gagal mengekstrak data tunggakan: {error}",
        ) from error
