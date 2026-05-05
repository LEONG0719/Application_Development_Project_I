import argparse
import csv
import re
from pathlib import Path

from pypdf import PdfReader


MONEY_RE = re.compile(r"\d[\d,]*\.\d{2}$")
ROW_START_RE = re.compile(r"^\s*\d+\s+")


def clean_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def parse_header(line: str, label: str, end_label: str) -> tuple[str, str]:
    pattern = rf"{label}\s*:\s*(\S+)\s+(.*?)(?:\s+{end_label}\s*:|$)"
    match = re.search(pattern, line)
    if not match:
        return "", ""
    return match.group(1).strip(), clean_spaces(match.group(2))


def parse_bayaran_pdf(pdf_path: Path) -> list[dict[str, str]]:
    reader = PdfReader(str(pdf_path))
    rows: list[dict[str, str]] = []

    for page_no, page in enumerate(reader.pages, start=1):
        text = page.extract_text(extraction_mode="layout") or ""
        jabatan_code = jabatan_name = ptjpk_code = ptjpk_name = ""

        for line in text.splitlines():
            if "JABATAN" in line and "KOD POTONGAN" in line:
                jabatan_code, jabatan_name = parse_header(line, "JABATAN", "KOD POTONGAN")
            elif "PTJPK" in line and "KOD AMANAH" in line:
                ptjpk_code, ptjpk_name = parse_header(line, "PTJPK", "KOD AMANAH/ HASIL")

            stripped = line.strip()
            if not ROW_START_RE.match(stripped) or not MONEY_RE.search(stripped):
                continue

            parts = [clean_spaces(part) for part in re.split(r"\s{2,}", stripped) if part.strip()]
            if len(parts) < 4:
                continue

            bil = parts[0]
            amaun = parts[-1].replace(",", "")
            nama = parts[-2]
            no_gaji_no_kp = parts[-3]
            no_rujukan = " ".join(parts[1:-3])

            rows.append(
                {
                    "page": str(page_no),
                    "jabatan_code": jabatan_code,
                    "jabatan_name": jabatan_name,
                    "ptjpk_code": ptjpk_code,
                    "ptjpk_name": ptjpk_name,
                    "bil": bil,
                    "no_rujukan": no_rujukan,
                    "no_gaji_no_kp": no_gaji_no_kp,
                    "nama": nama,
                    "amaun_rm": amaun,
                }
            )

    return rows


def write_csv(rows: list[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "page",
        "jabatan_code",
        "jabatan_name",
        "ptjpk_code",
        "ptjpk_name",
        "bil",
        "no_rujukan",
        "no_gaji_no_kp",
        "nama",
        "amaun_rm",
    ]
    with output_path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract resident bayaran / sewa rumah payment rows from the Johor payroll PDF."
    )
    parser.add_argument("pdf", type=Path, help="Input PDF path")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("resident_bayaran.csv"),
        help="Output CSV path",
    )
    args = parser.parse_args()

    rows = parse_bayaran_pdf(args.pdf)
    write_csv(rows, args.output)

    total = sum(float(row["amaun_rm"]) for row in rows)
    print(f"Extracted {len(rows)} rows")
    print(f"Total amaun RM {total:,.2f}")
    print(f"Saved to {args.output}")
    print()
    print("Note: this PDF has embedded text, so OCR is not required.")
    print("For scanned PDFs, install Tesseract + pytesseract/pdf2image and OCR each page image first.")


if __name__ == "__main__":
    main()
