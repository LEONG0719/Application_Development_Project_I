import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import { jsonRecord } from "@/lib/uploaded-document/shared";

export async function buildPenghuniExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.residentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = rows.map((row) =>
    jsonRecord<ExtractedPenghuniRecord>(row.rawData, {
      residentId: row.id,
      originalResidentId: row.originalResidentId ?? undefined,
      isExisted: row.isExisted,
      nama: row.fullName,
      noKadPengenalan: row.icNumber,
      kuarters: "",
      unit: "",
      alamatKuarters: row.description ?? "",
      perhubungan: row.phone ?? "",
      pekerjaan: row.position ?? "",
      jabatan: row.department ?? "",
      tarafPerkhidmatan: row.serviceLevel ?? "",
      sourceSheet: "",
      sourceRow: 0,
    }),
  );

  return {
    documentType: "penghuni" as const,
    recordCount: records.length,
    records,
  };
}
