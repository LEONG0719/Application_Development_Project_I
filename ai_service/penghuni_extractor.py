from __future__ import annotations

from dataclasses import dataclass
import re

from extractor_shared import (
    build_header_map_for,
    get_cell,
    normalize_date,
    normalize_unit,
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
        "NO KP",
        "NO K P",
        "NO KAD PENGENALAN BARU",
        "NO IC",
        "IC",
        "KAD PENGENALAN",
        "NO MYKAD",
        "MYKAD",
    ),
    "kategoriKawasan": (
        "KATEGORI KAWASAN",
        "KATEGORI",
        "KAWASAN",
        "KELAS",
        "KELAS KUARTERS",
        "KUARTERS",
        "NAMA KUARTERS",
        "LOKASI",
    ),
    "noRumahNoUnit": (
        "NO RUMAH NO UNIT",
        "NO RUMAH",
        "NO UNIT",
        "UNIT",
        "NO UNIT KUARTERS",
        "NOMBOR UNIT",
        "NOMBOR RUMAH",
        "RUMAH",
    ),
    "alamatKuarters": (
        "ALAMAT KUARTERS",
        "ALAMAT",
        "ALAMAT RUMAH",
        "ALAMAT UNIT",
        "ALAMAT KEDIAMAN",
    ),
    "jawatan": ("JAWATAN", "NAMA JAWATAN", "JAWATAN PEGAWAI", "PEKERJAAN"),
    "gred": ("GRED", "GRED JAWATAN", "GRED PEGAWAI"),
    "jabatan": ("JABATAN", "AGENSI", "KEMENTERIAN", "TEMPAT BERTUGAS", "BAHAGIAN"),
    "noTelefon": (
        "NO TELEFON",
        "NO TEL",
        "NO TELEFON BIMBIT",
        "TELEFON",
        "TEL",
        "HP",
        "NO HP",
        "NOMBOR TELEFON",
    ),
    "tarikhMasuk": (
        "TARIKH MASUK",
        "TARIKH MULA",
        "TARIKH MENDUDUKI",
        "TARIKH KEMASUKAN",
        "MULA DUDUK",
    ),
    "tarikhKeluar": (
        "TARIKH KELUAR",
        "TARIKH TAMAT",
        "TARIKH KOSONG",
        "TARIKH PENGOSONGAN",
    ),
    "sewaBulanan": (
        "SEWA BULANAN",
        "SEWA",
        "KADAR SEWA",
        "BAYARAN SEWA",
        "SEWA RM",
    ),
    "catatan": ("CATATAN", "NOTA", "REMARK", "REMARKS", "ULASAN", "STATUS"),
}

REQUIRED_FIELDS = ("nama", "noKadPengenalan")


@dataclass(frozen=True)
class ExtractedResident:
    nama: str
    noKadPengenalan: str
    kategoriKawasan: str
    noRumahNoUnit: str
    alamatKuarters: str
    jawatan: str
    gred: str
    jabatan: str
    noTelefon: str
    tarikhMasuk: str
    tarikhKeluar: str
    sewaBulanan: str
    catatan: str
    sourceSheet: str
    sourceRow: int

    def to_response(self) -> dict[str, str | int]:
        pekerjaan = self.jawatan
        if self.gred:
            pekerjaan = f"{pekerjaan} {self.gred}".strip()

        return {
            "nama": self.nama,
            "noKadPengenalan": self.noKadPengenalan,
            "kuarters": self.kategoriKawasan,
            "unit": self.noRumahNoUnit,
            "alamatKuarters": self.alamatKuarters,
            "perhubungan": self.noTelefon,
            "pekerjaan": pekerjaan,
            "jabatan": self.jabatan,
            "tarikhMasuk": self.tarikhMasuk,
            "tarikhKeluar": self.tarikhKeluar,
            "sewaBulanan": self.sewaBulanan,
            "catatan": self.catatan,
            "sourceSheet": self.sourceSheet,
            "sourceRow": self.sourceRow,
        }


def extract_penghuni_from_xlsx(file_bytes: bytes, limit: int | None = None) -> dict:
    workbook = read_xlsx(file_bytes)
    residents: list[ExtractedResident] = []

    for sheet in workbook["sheets"]:
        header_index = _find_header_row(sheet["rows"])
        if header_index is None:
            continue

        header_map = build_header_map_for(sheet["rows"][header_index], HEADER_ALIASES)

        for row_offset, row in enumerate(
            sheet["rows"][header_index + 1 :],
            start=header_index + 2,
        ):
            resident = _resident_from_row(sheet["name"], row_offset, row, header_map)
            if resident is None:
                continue

            residents.append(resident)
            if limit is not None and len(residents) >= limit:
                return _build_response(workbook["sheet_names"], residents)

    return _build_response(workbook["sheet_names"], residents)


def _find_header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows):
        header_map = build_header_map_for(row, HEADER_ALIASES)
        if all(field in header_map for field in REQUIRED_FIELDS):
            return index
    return None


def _resident_from_row(
    sheet_name: str,
    source_row: int,
    row: list[str],
    header_map: dict[str, int],
) -> ExtractedResident | None:
    nama = get_cell(row, header_map, "nama")
    no_kad_pengenalan = get_cell(row, header_map, "noKadPengenalan")

    if (
        not nama
        or nama.upper() == "KOSONG"
        or not _looks_like_ic_number(no_kad_pengenalan)
    ):
        return None

    return ExtractedResident(
        nama=nama,
        noKadPengenalan=no_kad_pengenalan,
        kategoriKawasan=get_cell(row, header_map, "kategoriKawasan"),
        noRumahNoUnit=normalize_unit(get_cell(row, header_map, "noRumahNoUnit")),
        alamatKuarters=get_cell(row, header_map, "alamatKuarters"),
        jawatan=get_cell(row, header_map, "jawatan"),
        gred=get_cell(row, header_map, "gred"),
        jabatan=get_cell(row, header_map, "jabatan"),
        noTelefon=get_cell(row, header_map, "noTelefon"),
        tarikhMasuk=normalize_date(get_cell(row, header_map, "tarikhMasuk")),
        tarikhKeluar=normalize_date(get_cell(row, header_map, "tarikhKeluar")),
        sewaBulanan=get_cell(row, header_map, "sewaBulanan"),
        catatan=get_cell(row, header_map, "catatan"),
        sourceSheet=sheet_name,
        sourceRow=source_row,
    )


def _build_response(sheet_names: list[str], residents: list[ExtractedResident]) -> dict:
    return {
        "documentType": "penghuni",
        "recordCount": len(residents),
        "availableSheets": sheet_names,
        "records": [resident.to_response() for resident in residents],
    }


def _looks_like_ic_number(value: str) -> bool:
    return bool(re.search(r"\d{5,6}-\d{2}-\d{4}", value))
