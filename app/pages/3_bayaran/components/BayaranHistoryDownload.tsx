"use client";

import ToolbarButton from "@/app/components/ToolbarIconButton";
import {
  downloadXlsxFile,
  type XlsxCell,
  type XlsxSheet,
} from "@/lib/download/xlsx-export";

import type { BayaranHistoryRecord } from "./types";

type BayaranHistoryDownloadProps = {
  records: BayaranHistoryRecord[];
  residentIc: string;
  residentName: string;
};

export default function BayaranHistoryDownload({
  records,
  residentIc,
  residentName,
}: BayaranHistoryDownloadProps) {
  function handleDownload() {
    const headers: XlsxCell[] = [
      { value: "Tarikh", style: "header" },
      { value: "ID", style: "header" },
      { value: "No. Resit", style: "header" },
      { value: "Sumber", style: "header", align: "center" },
      { value: "Catatan", style: "header" },
      { value: "Amaun (RM)", style: "header", align: "right" },
    ];
    const rows: XlsxSheet["rows"] = records.map((record) => [
      formatExportDate(record.paymentDate),
      record.paymentNo,
      record.receiptNo,
      { value: record.sourceLabel, align: "center" },
      record.description,
      { value: record.amount, type: "number", align: "right" },
    ]);

    downloadXlsxFile({
      filename: buildFilename(residentName, residentIc),
      sheets: [
        {
          name: "Sejarah Pembayaran",
          columns: [
            { width: 16 },
            { width: 22 },
            { width: 20 },
            { width: 16 },
            { width: 42 },
            { width: 16 },
          ],
          rows: [headers, ...rows],
        },
      ],
    });
  }

  return (
    <ToolbarButton
      icon="download"
      label="Muat turun sejarah pembayaran"
      disabled={records.length === 0}
      onClick={handleDownload}
    />
  );
}

function buildFilename(residentName: string, residentIc: string) {
  return [
    "sejarah-pembayaran",
    sanitizeFilenamePart(residentName),
    sanitizeFilenamePart(residentIc),
  ]
    .filter(Boolean)
    .join("-");
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatExportDate(value: string | null) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
