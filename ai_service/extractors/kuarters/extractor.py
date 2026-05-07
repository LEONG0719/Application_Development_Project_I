from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import json
import os
import re
import urllib.error
import urllib.request

from pypdf import PdfReader

from extractors.shared import (
    build_header_map_for,
    clean_header,
    get_cell,
    normalize_fee,
    normalize_unit,
    read_xlsx,
)


PARSING_MODE_STRICT = "strict"
PARSING_MODE_ASSISTED = "assisted"
UNKNOWN_ADDRESS = "N/A"

QUARTER_HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "kategoriKawasan": (
        "KATEGORI KAWASAN",
        "KATEGORI / KAWASAN",
        "KATEGORI",
        "KAWASAN",
        "NAMA KUARTERS",
        "CATEGORY",
        "AREA",
        "QUARTERS CATEGORY",
    ),
    "noRumahNoUnit": (
        "NO RUMAH NO UNIT",
        "NO. RUMAH / NO. UNIT",
        "NO RUMAH",
        "NO UNIT",
        "UNIT",
        "NOMBOR UNIT",
        "NO. UNIT",
        "ID UNIT",
        "KOD UNIT",
        "UNIT CODE",
        "HOUSE NO",
    ),
    "alamatKuarters": (
        "ALAMAT KUARTERS",
        "ALAMAT",
        "ALAMAT RUMAH",
        "LOKASI",
        "ADDRESS",
        "QUARTERS ADDRESS",
        "BLOCK ADDRESS",
    ),
    "sewaBulanan": (
        "SEWA",
        "SEWA (RM)",
        "SEWA RM",
        "SEWA(RM)",
        "SEWA BULANAN",
        "KADAR SEWA",
        "RENT",
        "RENTAL",
        "RENTAL PRICE",
    ),
    "senggara": (
        "SENGGARA",
        "SENGGARA (RM)",
        "SENGGARA RM",
        "PENYELENGGARAAN",
        "YURAN PENYELENGGARAAN",
        "MAINTENANCE",
        "MAINTENANCE FEE",
    ),
    "kadarDenda": (
        "KADAR DENDA",
        "DENDA",
        "PENALTI",
        "PENALTI (RM)",
        "PENALTY",
        "FINE",
    ),
}

QUARTER_CONTEXT_FIELDS = (
    "kategoriKawasan",
    "alamatKuarters",
    "sewaBulanan",
    "senggara",
    "kadarDenda",
)


@dataclass
class ExtractedQuarterUnit:
    unitCode: str
    address: str

    def to_response(self) -> dict[str, str]:
        return {
            "unitCode": self.unitCode,
            "address": self.address,
        }


@dataclass
class ExtractedQuarterCategory:
    id: str
    categoryName: str
    address: str
    rentalPrice: str
    maintenancePrice: str
    penaltyPrice: str
    units: list[ExtractedQuarterUnit]

    def to_response(self) -> dict[str, str | int | list[dict[str, str]]]:
        return {
            "id": self.id,
            "categoryName": self.categoryName,
            "address": self.address,
            "rentalPrice": self.rentalPrice,
            "maintenancePrice": self.maintenancePrice,
            "penaltyPrice": self.penaltyPrice,
            "unitCount": len(self.units),
            "units": [unit.to_response() for unit in self.units],
        }


def extract_kuarters_document(
    file_bytes: bytes,
    filename: str,
    parsing_mode: str = PARSING_MODE_STRICT,
    limit: int | None = None,
) -> dict:
    normalized_mode = _normalize_parsing_mode(parsing_mode)
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    try:
        if extension == "xlsx":
            response = extract_kuarters_from_xlsx(file_bytes, limit=limit)
        elif extension == "pdf":
            response = extract_kuarters_from_pdf(file_bytes, limit=limit)
        else:
            raise ValueError("Sila muat naik fail .xlsx atau .pdf sahaja.")

        return _with_parsing_metadata(
            _validate_kuarters_response(response),
            normalized_mode,
        )
    except Exception as rule_error:
        if normalized_mode == PARSING_MODE_STRICT:
            raise

        ai_response = _extract_kuarters_with_gemini(file_bytes, filename, limit)
        return _with_parsing_metadata(
            _validate_kuarters_response(ai_response),
            normalized_mode,
        )


def extract_kuarters_from_xlsx(file_bytes: bytes, limit: int | None = None) -> dict:
    workbook = read_xlsx(file_bytes)
    categories: dict[str, ExtractedQuarterCategory] = {}

    for sheet in workbook["sheets"]:
        header_index = _find_quarter_header_row(sheet["rows"])
        if header_index is None:
            continue

        header_map = build_header_map_for(
            sheet["rows"][header_index],
            QUARTER_HEADER_ALIASES,
        )
        current_rental = ""
        current_maintenance = ""
        current_penalty = ""
        sheet_category_name = _sheet_category_name(sheet["name"])

        for row_offset, row in enumerate(
            sheet["rows"][header_index + 1 :],
            start=header_index + 2,
        ):
            rental = normalize_fee(get_cell(row, header_map, "sewaBulanan"))
            maintenance = get_cell(row, header_map, "senggara")
            penalty = normalize_fee(get_cell(row, header_map, "kadarDenda"))

            if rental:
                current_rental = rental
            if maintenance:
                current_maintenance = maintenance
            if penalty:
                current_penalty = penalty

            category = _category_from_row(
                row,
                header_map,
                sheet["name"],
                row_offset,
                sheet_category_name,
                current_rental,
                current_maintenance,
                current_penalty,
            )

            if category is None:
                continue

            if category.id not in categories:
                categories[category.id] = category
            else:
                categories[category.id].units.extend(category.units)

            if limit is not None and len(categories) >= limit:
                return _build_quarters_response(
                    workbook["sheet_names"],
                    list(categories.values()),
                )

    return _build_quarters_response(workbook["sheet_names"], list(categories.values()))


def _category_from_row(
    row: list[str],
    header_map: dict[str, int],
    sheet_name: str,
    source_row: int,
    sheet_category_name: str,
    current_rental: str = "",
    current_maintenance: str = "",
    current_penalty: str = "",
) -> ExtractedQuarterCategory | None:
    kawasan = get_cell(row, header_map, "kategoriKawasan")
    address = _quarter_address(
        kawasan,
        get_cell(row, header_map, "alamatKuarters"),
        sheet_category_name,
    )
    unit_code = normalize_unit(get_cell(row, header_map, "noRumahNoUnit"))

    if not unit_code or _is_summary_unit(unit_code):
        return None

    rental = _normalize_money_or_zero(
        normalize_fee(get_cell(row, header_map, "sewaBulanan")) or current_rental
    )
    maintenance = _normalize_money_or_zero(
        normalize_fee(get_cell(row, header_map, "senggara") or current_maintenance)
    )
    penalty = _normalize_money_or_zero(
        normalize_fee(get_cell(row, header_map, "kadarDenda")) or current_penalty
    )
    base_category_name = kawasan or sheet_category_name or address
    category_name = base_category_name
    category_id = _category_id(
        category_name,
        address,
        rental,
        maintenance,
        penalty,
    )

    return ExtractedQuarterCategory(
        id=category_id,
        categoryName=category_name,
        address=_fallback_address(address),
        rentalPrice=rental,
        maintenancePrice=maintenance,
        penaltyPrice=penalty,
        units=[
            ExtractedQuarterUnit(
                unitCode=unit_code,
                address=_fallback_address(get_cell(row, header_map, "alamatKuarters") or address),
            )
        ],
    )


def extract_kuarters_from_pdf(file_bytes: bytes, limit: int | None = None) -> dict:
    reader = PdfReader(BytesIO(file_bytes))
    categories: dict[str, ExtractedQuarterCategory] = {}

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        rows = _rows_from_pdf_text(text)
        if not rows:
            continue

        header_index = _find_quarter_header_row(rows)
        if header_index is None:
            continue

        header = rows[header_index]
        header_map = build_header_map_for(header, QUARTER_HEADER_ALIASES)
        column_count = len(header)
        data_lines = rows[header_index + 1 :]

        for row_offset, row in enumerate(
            _chunk_pdf_rows(data_lines, column_count),
            start=header_index + 2,
        ):
            category = _category_from_row(
                row,
                header_map,
                sheet_name=f"Halaman {page_number}",
                source_row=row_offset,
                sheet_category_name=_pdf_page_category(text),
            )

            if category is None:
                continue

            existing_category = categories.get(category.id)
            if existing_category:
                existing_category.units.extend(category.units)
            else:
                categories[category.id] = category

            if limit is not None and len(categories) >= limit:
                return _build_quarters_response(
                    [f"Halaman {index}" for index in range(1, len(reader.pages) + 1)],
                    list(categories.values()),
                )

    return _build_quarters_response(
        [f"Halaman {index}" for index in range(1, len(reader.pages) + 1)],
        list(categories.values()),
    )


def _find_quarter_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_map = build_header_map_for(row, QUARTER_HEADER_ALIASES)
        if "noRumahNoUnit" in header_map and any(
            field in header_map for field in QUARTER_CONTEXT_FIELDS
        ):
            return index
    return None


def _build_quarters_response(
    _sheet_names: list[str],
    categories: list[ExtractedQuarterCategory],
) -> dict:
    total_units = sum(len(category.units) for category in categories)

    return {
        "documentType": "kuarters",
        "recordCount": len(categories),
        "totalUnits": total_units,
        "records": [category.to_response() for category in categories],
    }


def _normalize_parsing_mode(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {PARSING_MODE_STRICT, PARSING_MODE_ASSISTED}:
        return normalized
    return PARSING_MODE_STRICT


def _with_parsing_metadata(response: dict, parsing_mode: str) -> dict:
    return {
        **response,
        "parsingMode": parsing_mode,
    }


def _validate_kuarters_response(response: dict) -> dict:
    records = response.get("records")
    if not isinstance(records, list) or len(records) == 0:
        raise ValueError("Tiada rekod kuarters yang lengkap ditemui.")

    errors: list[str] = []
    seen_units: set[str] = set()

    for index, record in enumerate(records, start=1):
        category_name = str(record.get("categoryName", "")).strip()
        address = _fallback_address(str(record.get("address", "")).strip())
        record["address"] = address
        units = record.get("units")

        if not category_name:
            errors.append(f"Rekod {index}: kategori kuarters diperlukan.")
        for field in ("rentalPrice", "maintenancePrice", "penaltyPrice"):
            record[field] = _normalize_money_or_zero(str(record.get(field, "")))

        if not isinstance(units, list) or len(units) == 0:
            errors.append(f"Rekod {index}: sekurang-kurangnya satu unit diperlukan.")
            continue

        for unit in units:
            unit_code = str(unit.get("unitCode", "")).strip()
            unit["address"] = _fallback_address(str(unit.get("address", "")).strip() or address)
            unit_key = "|".join(
                [
                    clean_header(category_name),
                    clean_header(address),
                    clean_header(unit_code),
                ]
            )

            if not unit_code:
                errors.append(f"Rekod {index}: kod unit diperlukan.")
            elif unit_key in seen_units:
                errors.append(f"Rekod {index}: unit pendua dalam dokumen ({unit_code}).")
            else:
                seen_units.add(unit_key)

    if errors:
        raise ValueError(" ".join(errors[:5]))

    return response


def _is_valid_money(value: str) -> bool:
    normalized = normalize_fee(value)
    return bool(re.fullmatch(r"\d+(\.\d{1,2})?", normalized))


def _normalize_money_or_zero(value: str) -> str:
    normalized = normalize_fee(value)
    if _is_valid_money(normalized):
        return normalized
    return "0"


def _rows_from_pdf_text(text: str) -> list[list[str]]:
    lines = [
        re.sub(r"\s+", " ", line).strip()
        for line in text.splitlines()
        if line.strip()
    ]
    header_start = next(
        (
            index
            for index, line in enumerate(lines)
            if clean_header(line) in {"KATEGORI", "CATEGORY"}
        ),
        None,
    )

    if header_start is None:
        return [[cell] for cell in lines]

    header_end = header_start
    while header_end < len(lines) and canonical_field_for_pdf_line(lines[header_end]):
        header_end += 1

    header = lines[header_start:header_end]
    if len(header) < 2:
        return [[cell] for cell in lines]

    data_values = lines[header_end:]
    rows = [header]
    rows.extend(
        data_values[index : index + len(header)]
        for index in range(0, len(data_values), len(header))
        if len(data_values[index : index + len(header)]) == len(header)
    )
    return rows


def canonical_field_for_pdf_line(value: str) -> str | None:
    return next(
        (
            field
            for field, aliases in QUARTER_HEADER_ALIASES.items()
            if clean_header(value) in {clean_header(alias) for alias in aliases}
        ),
        None,
    )


def _chunk_pdf_rows(rows: list[list[str]], column_count: int) -> list[list[str]]:
    if all(len(row) == column_count for row in rows):
        return rows

    flat_rows = [row[0] for row in rows if row and row[0]]
    chunked_rows = []

    for index in range(0, len(flat_rows), column_count):
        chunk = flat_rows[index : index + column_count]
        if len(chunk) == column_count:
            chunked_rows.append(chunk)

    return chunked_rows


def _pdf_page_category(text: str) -> str:
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
    if clean_header(first_line).startswith("KATEGORI "):
        return first_line
    return ""


def _extract_kuarters_with_gemini(
    file_bytes: bytes,
    filename: str,
    limit: int | None,
) -> dict:
    api_keys = _gemini_api_keys()
    if not api_keys:
        raise ValueError(
            "Parsing bantuan AI gagal kerana tiada kunci API Gemini dikonfigurasi."
        )

    raw_text = _raw_text_for_ai(file_bytes, filename)
    if not raw_text:
        raise ValueError("Kandungan dokumen tidak dapat dibaca untuk bantuan AI.")

    prompt = {
        "contents": [
            {
                "parts": [
                    {
                        "text": (
                            "Extract Malaysian quarters/unit data as compact JSON. "
                            "Return only JSON with documentType='kuarters', recordCount, "
                            "totalUnits, and records. Each record requires id, categoryName, "
                            "address, rentalPrice, maintenancePrice, penaltyPrice, "
                            "unitCount, units. Each unit requires unitCode and address. "
                            "Use strings for money. If address is missing, set it to N/A.\n\n"
                            f"Filename: {filename}\nLimit: {limit or 'none'}\n\n{raw_text[:24000]}"
                        )
                    }
                ]
            }
        ],
        "generationConfig": {"responseMimeType": "application/json"},
    }

    errors: list[str] = []
    for key_index, api_key in enumerate(api_keys, start=1):
        try:
            parsed = _call_gemini_kuarters_parser(api_key, prompt)

            if limit is not None:
                parsed["records"] = parsed.get("records", [])[:limit]

            parsed["recordCount"] = len(parsed.get("records", []))
            parsed["totalUnits"] = sum(
                len(record.get("units", [])) for record in parsed.get("records", [])
            )
            return parsed
        except Exception as error:
            errors.append(f"kunci #{key_index}: {error}")

    raise ValueError(
        "Parsing bantuan AI gagal untuk semua kunci API Gemini. "
        + " | ".join(errors[:5])
    )


def _gemini_api_keys() -> list[str]:
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

    return unique_keys


def _call_gemini_kuarters_parser(api_key: str, prompt: dict) -> dict:
    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={api_key}",
        data=json.dumps(prompt).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        raise ValueError(f"HTTP {error.code}: {_compact_error_body(error_body)}") from error
    except urllib.error.URLError as error:
        raise ValueError(str(error.reason)) from error

    text = (
        payload.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not text:
        raise ValueError("respons AI kosong")

    return json.loads(text)


def _compact_error_body(value: str) -> str:
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


def _raw_text_for_ai(file_bytes: bytes, filename: str) -> str:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension == "pdf":
        reader = PdfReader(BytesIO(file_bytes))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)

    if extension == "xlsx":
        workbook = read_xlsx(file_bytes)
        lines = []
        for sheet in workbook["sheets"]:
            lines.append(f"Sheet: {sheet['name']}")
            lines.extend("\t".join(row) for row in sheet["rows"])
        return "\n".join(lines)

    return ""


def _sheet_category_name(sheet_name: str) -> str:
    value = re.sub(r"\s+", " ", sheet_name).strip()
    if re.fullmatch(r"sheet\s*\d+", value, flags=re.IGNORECASE):
        return ""
    if clean_header(value) in {"SENARAI KUARTERS", "KUARTERS", "DATA KUARTERS"}:
        return ""
    return value


def _quarter_address(kawasan: str, address: str, category_name: str) -> str:
    for value in (address, kawasan):
        normalized_value = re.sub(r"\s+", " ", value).strip()
        if normalized_value and clean_header(normalized_value) != clean_header(category_name):
            return normalized_value
    return ""


def _fallback_address(value: str) -> str:
    normalized_value = re.sub(r"\s+", " ", value).strip()
    return normalized_value or UNKNOWN_ADDRESS


def _category_id(
    category_name: str,
    address: str,
    rental_price: str,
    maintenance_price: str,
    penalty_price: str,
) -> str:
    raw_key = "|".join(
        [category_name, address, rental_price, maintenance_price, penalty_price]
    )
    return re.sub(r"[^a-z0-9]+", "-", raw_key.lower()).strip("-")


def _is_summary_unit(value: str) -> bool:
    clean_value = clean_header(value)
    return clean_value in {
        "ISI",
        "KOSONG",
        "LAIN LAIN",
        "KPRJ",
        "JUMLAH KUARTERS",
        "JUMLAH",
    }
