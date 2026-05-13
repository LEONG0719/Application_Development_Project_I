import type { ExtractedTunggakanRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import { jsonRecord } from "@/lib/uploaded-document/shared";

export async function buildTunggakanExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records = rows.map((row) =>
    jsonRecord<ExtractedTunggakanRecord>(row.rawData, {
      arrearsSummaryId: row.id,
      residentId: row.originalResidentId ?? undefined,
      isExisted: row.isExisted,
      importStatus: row.isExisted ? "IGNORED" : "PENDING",
      importMessage: row.isExisted
        ? "Rekod tunggakan telah wujud dalam sistem."
        : undefined,
      nama: row.residentName,
      noKadPengenalan: row.residentIcNumber,
      jumlahTunggakan: row.totalArrearsAmount.toFixed(2),
      sourceSheet: "",
      sourceRow: 0,
    }),
  );
  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    documentType: "tunggakan" as const,
    recordCount: acceptedRecords.length,
    totalAmount: acceptedRecords
      .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
      .toFixed(2),
    records,
  };
}
