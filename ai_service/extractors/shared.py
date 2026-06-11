from __future__ import annotations

from datetime import datetime, timedelta
from functools import lru_cache
from io import BytesIO
import json
import os
import posixpath
import re
import threading
import urllib.error
import urllib.request
import zipfile
import xml.etree.ElementTree as ET


SPREADSHEET_NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}
SPREADSHEET_MAIN_NS = SPREADSHEET_NS["a"]
CELL_TAG = f"{{{SPREADSHEET_MAIN_NS}}}c"
INLINE_STRING_TAG = f"{{{SPREADSHEET_MAIN_NS}}}is"
ROW_TAG = f"{{{SPREADSHEET_MAIN_NS}}}row"
TEXT_TAG = f"{{{SPREADSHEET_MAIN_NS}}}t"
VALUE_TAG = f"{{{SPREADSHEET_MAIN_NS}}}v"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"
DEFAULT_GEMINI_TIMEOUT_SECONDS = 30.0
_GEMINI_KEY_LOCK = threading.Lock()
_preferred_gemini_key_index = 0


def read_xlsx(file_bytes: bytes) -> dict:
    with zipfile.ZipFile(BytesIO(file_bytes)) as archive:
        shared_strings = _read_shared_strings(archive)
        sheet_paths = _read_sheet_paths(archive)

        sheets = []
        for sheet_name, sheet_path in sheet_paths:
            rows = _read_sheet_rows(archive, sheet_path, shared_strings)
            sheets.append({"name": sheet_name, "rows": rows})

    return {
        "sheet_names": [name for name, _path in sheet_paths],
        "sheets": sheets,
    }


def build_header_map_for(
    row: list[str],
    aliases_by_field: dict[str, tuple[str, ...]],
) -> dict[str, int]:
    header_map: dict[str, int] = {}
    alias_lookup = build_alias_lookup(aliases_by_field)

    for index, header in enumerate(row):
        canonical_field = alias_lookup.get(clean_header(header))
        if canonical_field and canonical_field not in header_map:
            header_map[canonical_field] = index

    return header_map


def canonical_field_for_header(
    header: str,
    aliases_by_field: dict[str, tuple[str, ...]],
) -> str | None:
    clean_header_value = clean_header(header)
    if not clean_header_value:
        return None

    return build_alias_lookup(aliases_by_field).get(clean_header_value)


def build_alias_lookup(aliases_by_field: dict[str, tuple[str, ...]]) -> dict[str, str]:
    signature = tuple(
        (field, tuple(aliases))
        for field, aliases in aliases_by_field.items()
    )
    return _build_alias_lookup_cached(signature)


@lru_cache(maxsize=32)
def _build_alias_lookup_cached(
    aliases_by_field: tuple[tuple[str, tuple[str, ...]], ...],
) -> dict[str, str]:
    alias_lookup: dict[str, str] = {}

    for field, aliases in aliases_by_field:
        for alias in aliases:
            clean_alias = clean_header(alias)
            if clean_alias:
                alias_lookup.setdefault(clean_alias, field)

    return alias_lookup


def get_cell(row: list[str], header_map: dict[str, int], header: str) -> str:
    index = header_map.get(header)
    if index is None or index >= len(row):
        return ""
    return row[index].strip()


@lru_cache(maxsize=4096)
def clean_header(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", value.upper()).strip()


def normalize_unit(value: str) -> str:
    if value.endswith(".0"):
        return value[:-2]
    return value


def normalize_date(value: str) -> str:
    if not value:
        return ""

    if re.fullmatch(r"\d+(\.0)?", value):
        serial = int(float(value))
        return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()

    for date_format in ("%d/%m/%Y", "%d.%m.%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, date_format).date().isoformat()
        except ValueError:
            pass

    return value


def normalize_fee(value: str) -> str:
    value = value.strip()
    if not value:
        return ""
    if value.lower() in {"tiada", "n/a", "na", "-"}:
        return "0"
    if value.endswith(".0"):
        return value[:-2]
    return value


def _read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings = []
    for item in root.findall("a:si", SPREADSHEET_NS):
        strings.append(
            "".join(text.text or "" for text in item.iter(TEXT_TAG))
        )
    return strings


def _read_sheet_paths(archive: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    archive_names = set(archive.namelist())
    rel_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels
        if rel.attrib.get("Target")
    }

    sheet_paths: list[tuple[str, str]] = []
    for sheet in workbook.findall("a:sheets/a:sheet", SPREADSHEET_NS):
        rel_id = sheet.attrib.get(f"{{{SPREADSHEET_NS['r']}}}id")
        target = rel_map.get(rel_id or "")
        if not target:
            continue

        normalized_target = _workbook_relationship_path(target, archive_names)

        sheet_paths.append((sheet.attrib["name"], normalized_target))

    return sheet_paths

def _workbook_relationship_path(target: str, archive_names: set[str]) -> str:
    normalized_target = posixpath.normpath(target.replace("\\", "/").lstrip("/"))
    candidates = []

    if normalized_target.startswith("xl/"):
        candidates.append(normalized_target)
    else:
        candidates.append(posixpath.normpath(f"xl/{normalized_target}"))
        candidates.append(normalized_target)

    for candidate in candidates:
        if candidate in archive_names:
            return candidate

    return candidates[0]


def _read_sheet_rows(
    archive: zipfile.ZipFile,
    sheet_path: str,
    shared_strings: list[str],
) -> list[list[str]]:
    root = ET.fromstring(archive.read(sheet_path))
    rows: list[list[str]] = []

    for row in root.iter(ROW_TAG):
        values: list[str] = []
        for cell in row:
            if cell.tag != CELL_TAG:
                continue

            column_index = _column_index(cell.attrib.get("r", "A1"))
            while len(values) < column_index:
                values.append("")
            values[column_index - 1] = _cell_value(cell, shared_strings)

        rows.append(values)

    return rows


def _cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value = None
    inline = None

    for child in cell:
        if child.tag == VALUE_TAG:
            value = child
        elif child.tag == INLINE_STRING_TAG:
            inline = child

    if cell_type == "s" and value is not None:
        return shared_strings[int(value.text or 0)].strip()

    if cell_type == "inlineStr":
        if inline is None:
            return ""
        return "".join(
            text.text or "" for text in inline.iter(TEXT_TAG)
        ).strip()

    return (value.text or "").strip() if value is not None else ""


def _column_index(cell_reference: str) -> int:
    index = 0
    for char in cell_reference:
        if not "A" <= char <= "Z":
            break
        index = index * 26 + ord(char) - 64

    return index or 1


@lru_cache(maxsize=1)
def gemini_api_keys() -> tuple[str, ...]:
    keys = [
        os.getenv(f"GEMINI_API_KEY_{index}", "").strip()
        for index in range(1, 51)
    ]
    unique_keys = []
    seen_keys = set()

    for key in keys:
        if key and key not in seen_keys:
            unique_keys.append(key)
            seen_keys.add(key)

    return tuple(unique_keys)


@lru_cache(maxsize=1)
def gemini_model() -> str:
    return os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_GEMINI_MODEL


@lru_cache(maxsize=1)
def gemini_timeout_seconds() -> float:
    raw_timeout = os.getenv("GEMINI_REQUEST_TIMEOUT_SECONDS", "").strip()

    try:
        timeout = float(raw_timeout)
    except ValueError:
        timeout = DEFAULT_GEMINI_TIMEOUT_SECONDS

    return min(max(timeout, 5.0), 120.0)


def call_gemini_json(prompt: dict) -> dict:
    keys = gemini_api_keys()
    if not keys:
        raise ValueError("Kunci API Gemini tidak dikonfigurasi.")

    model = gemini_model()
    request_body = _gemini_request_body(prompt, model)
    last_error: ValueError | None = None

    for key_index, api_key in _ordered_gemini_keys(keys):
        request = urllib.request.Request(
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent",
            data=request_body,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": api_key,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=gemini_timeout_seconds(),
            ) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            error_body = error.read().decode("utf-8", errors="replace")
            last_error = ValueError(
                f"HTTP {error.code}: {_compact_gemini_error(error_body)}"
            )

            if error.code in {401, 403, 429}:
                continue

            raise last_error from error
        except (urllib.error.URLError, TimeoutError) as error:
            reason = getattr(error, "reason", error)
            raise ValueError(f"Gemini tidak dapat dihubungi: {reason}") from error

        _remember_gemini_key(key_index)
        return _gemini_json_payload(payload)

    raise last_error or ValueError("Tiada kunci API Gemini yang boleh digunakan.")


def _gemini_request_body(prompt: dict, model: str) -> bytes:
    request_prompt = dict(prompt)
    generation_config = dict(request_prompt.get("generationConfig") or {})
    generation_config["responseMimeType"] = "application/json"
    if model.startswith("gemini-2.5-"):
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}
    request_prompt["generationConfig"] = generation_config

    return json.dumps(request_prompt, ensure_ascii=False).encode("utf-8")


def _ordered_gemini_keys(keys: tuple[str, ...]) -> list[tuple[int, str]]:
    with _GEMINI_KEY_LOCK:
        start_index = _preferred_gemini_key_index % len(keys)

    return [
        ((start_index + offset) % len(keys), keys[(start_index + offset) % len(keys)])
        for offset in range(len(keys))
    ]


def _remember_gemini_key(key_index: int) -> None:
    global _preferred_gemini_key_index

    with _GEMINI_KEY_LOCK:
        _preferred_gemini_key_index = key_index


def _gemini_json_payload(payload: dict) -> dict:
    candidates = payload.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise ValueError("Respons AI tidak mengandungi calon jawapan.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = next(
        (
            str(part.get("text", "")).strip()
            for part in parts
            if (
                isinstance(part, dict)
                and not part.get("thought")
                and str(part.get("text", "")).strip()
            )
        ),
        "",
    )
    if not text:
        raise ValueError("Respons AI kosong.")

    parsed = json.loads(text)
    if not isinstance(parsed, dict):
        raise ValueError("Respons AI bukan objek JSON.")

    return parsed


def _compact_gemini_error(value: str) -> str:
    if not value:
        return "tiada butiran ralat"

    try:
        parsed = json.loads(value)
        message = parsed.get("error", {}).get("message")
        status = parsed.get("error", {}).get("status")
        if message and status:
            return f"{status} - {message}"
        if message:
            return str(message)
    except json.JSONDecodeError:
        pass

    return re.sub(r"\s+", " ", value).strip()[:300]
