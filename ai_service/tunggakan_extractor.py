from __future__ import annotations

from dataclasses import dataclass
import re

from extractor_shared import (
    build_header_map_for,
    get_cell,
    normalize_fee,
    read_xlsx,
)


HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "nama": (
        "NAMA PENGHUNI",
        "NAMA",
        "NAMA PENUH",
        "NAMA PENYEWA",
        "NAMA PEGAWAI",
        "PENGHUNI",
    ),
    "noKadPengenalan": (
        "NO KAD PENGENALAN",
        "NO. KAD PENGENALAN",
        "NO KP",
        "NO K P",
        "NO KAD PENGENALAN BARU",
        "NO IC",
        "IC",
        "KAD PENGENALAN",
        "NO MYKAD",
        "MYKAD",
    ),
    "jumlahTunggakan": (
        "TUNGGAKAN",
        "JUMLAH TUNGGAKAN",
        "JUMLAH TUNGGAKAN RM",
        "TUNGGAKAN RM",
        "AMAUN TUNGGAKAN",
        "BAKI TUNGGAKAN",
        "ARREARS",
        "TOTAL ARREARS",
    ),
}

REQUIRED_FIELDS = ("nama", "noKadPengenalan", "jumlahTunggakan")


@dataclass(frozen=True)
class ExtractedArrears:
    nama: str
    noKadPengenalan: str
    jumlahTunggakan: str
    sourceSheet: str
    sourceRow: int

    def to_response(self) -> dict[str, str | int]:
        return {
            "nama": self.nama,
            "noKadPengenalan": self.noKadPengenalan,
            "jumlahTunggakan": self.jumlahTunggakan,
            "sourceSheet": self.sourceSheet,
            "sourceRow": self.sourceRow,
        }


def extract_tunggakan_from_xlsx(file_bytes: bytes, limit: int | None = None) -> dict:
    workbook = read_xlsx(file_bytes)
    arrears: list[ExtractedArrears] = []

    for sheet in workbook["sheets"]:
        header_index = _find_header_row(sheet["rows"])
        if header_index is None:
            continue

        header_map = build_header_map_for(sheet["rows"][header_index], HEADER_ALIASES)

        for row_offset, row in enumerate(
            sheet["rows"][header_index + 1 :],
            start=header_index + 2,
        ):
            record = _arrears_from_row(sheet["name"], row_offset, row, header_map)
            if record is None:
                continue

            arrears.append(record)
            if limit is not None and len(arrears) >= limit:
                return _build_response(workbook["sheet_names"], arrears)

    return _build_response(workbook["sheet_names"], arrears)


def _find_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_map = build_header_map_for(row, HEADER_ALIASES)
        if all(field in header_map for field in REQUIRED_FIELDS):
            return index
    return None


def _arrears_from_row(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
) -> ExtractedArrears | None:
    nama = get_cell(row, header_map, "nama")
    no_kad_pengenalan = get_cell(row, header_map, "noKadPengenalan")
    jumlah_tunggakan = normalize_fee(get_cell(row, header_map, "jumlahTunggakan"))

    if not nama or not _looks_like_ic_number(no_kad_pengenalan):
        return None

    return ExtractedArrears(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        jumlahTunggakan=jumlah_tunggakan or "0",
        sourceSheet=sheet_name,
        sourceRow=source_row,
    )


def _build_response(sheet_names: list[str], arrears: list[ExtractedArrears]) -> dict:
    total_amount = sum(float(record.jumlahTunggakan or 0) for record in arrears)

    return {
        "documentType": "tunggakan",
        "recordCount": len(arrears),
        "totalAmount": f"{total_amount:.2f}",
        "availableSheets": sheet_names,
        "records": [record.to_response() for record in arrears],
    }


def _looks_like_ic_number(value: str) -> bool:
    return bool(re.search(r"\d{5,6}-\d{2}-\d{4}", value))
