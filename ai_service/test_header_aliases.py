from __future__ import annotations

from io import BytesIO
import zipfile

from extractor import extract_penghuni_from_xlsx


def _cell_ref(row: int, column: int) -> str:
    letters = ""
    while column:
        column, remainder = divmod(column - 1, 26)
        letters = chr(65 + remainder) + letters
    return f"{letters}{row}"


def _sheet_xml(rows: list[list[str]]) -> str:
    sheet_rows = []
    for row_index, row in enumerate(rows, start=1):
        cells = []
        for column_index, value in enumerate(row, start=1):
            cell_ref = _cell_ref(row_index, column_index)
            cells.append(
                f'<c r="{cell_ref}" t="inlineStr"><is><t>{value}</t></is></c>'
            )
        sheet_rows.append(f'<row r="{row_index}">{"".join(cells)}</row>')

    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        "</worksheet>"
    )


def _minimal_xlsx(rows: list[list[str]]) -> bytes:
    output = BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            "</Types>",
        )
        archive.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        archive.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Alias Test" sheetId="1" r:id="rId1"/></sheets>'
            "</workbook>",
        )
        archive.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            "</Relationships>",
        )
        archive.writestr("xl/worksheets/sheet1.xml", _sheet_xml(rows))

    return output.getvalue()


def test_header_aliases() -> None:
    workbook = _minimal_xlsx(
        [
            [
                "Nama",
                "No IC",
                "No Unit",
                "Alamat Rumah",
                "Telefon",
                "Pekerjaan",
                "Agensi",
            ],
            [
                "Ali bin Abu",
                "900101-01-1234",
                "A-01-02",
                "Jalan Mawar 1",
                "012-3456789",
                "Penolong Jurutera",
                "JKR Johor",
            ],
        ]
    )

    result = extract_penghuni_from_xlsx(workbook)
    assert result["recordCount"] == 1

    record = result["records"][0]
    assert record["nama"] == "Ali bin Abu"
    assert record["noKadPengenalan"] == "900101-01-1234"
    assert record["unit"] == "A-01-02"
    assert record["alamatKuarters"] == "Jalan Mawar 1"
    assert record["perhubungan"] == "012-3456789"
    assert record["pekerjaan"] == "Penolong Jurutera"
    assert record["jabatan"] == "JKR Johor"


if __name__ == "__main__":
    test_header_aliases()
    print("Header alias test passed.")
