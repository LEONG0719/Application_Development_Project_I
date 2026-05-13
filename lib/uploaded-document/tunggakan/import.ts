import type { Prisma } from "@prisma/client";

import type {
  ExtractedTunggakanRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  findResidentByNormalizedIc,
  rawData,
} from "@/lib/uploaded-document/shared";

function tunggakanIdentityKey(name: string, icNumber: string) {
  return [normalizeExtractText(name), icNumber.replace(/\D/g, "")].join("|");
}

function normalizeExtractText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toUpperCase();
}

export async function createPendingTunggakanRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "tunggakan") {
    return extractResult;
  }

  const seen = new Set<string>();
  const records: ExtractedTunggakanRecord[] = [];

  for (const record of extractResult.records) {
    const icNumber = record.noKadPengenalan.trim();
    const identityKey = tunggakanIdentityKey(record.nama, icNumber);
    const residentId = await findResidentByNormalizedIc(tx, icNumber);
    const existingSummary = residentId
      ? await tx.arrearsSummary.findUnique({
          where: { residentId },
          select: { id: true },
        })
      : null;
    const isDuplicateInDocument = seen.has(identityKey);
    const isExisted = Boolean(existingSummary?.id || isDuplicateInDocument);
    const draft = await tx.arrearsSummaryDraft.create({
      data: {
        residentName: record.nama,
        residentIcNumber: icNumber,
        totalArrearsAmount: record.jumlahTunggakan || "0",
        description: "tunggakan",
        uploadedDocumentId,
        originalResidentId: residentId || null,
        originalSummaryId: existingSummary?.id ?? null,
        isExisted,
        rawData: rawData(record),
      },
    });

    seen.add(identityKey);
    records.push({
      ...record,
      arrearsSummaryId: draft.id,
      residentId: residentId || undefined,
      isExisted,
      importStatus: isExisted ? "IGNORED" : "PENDING",
      importMessage: isExisted
        ? isDuplicateInDocument
          ? "Rekod tunggakan pendua dalam fail ini."
          : "Rekod tunggakan telah wujud dalam sistem."
        : undefined,
    });
  }

  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    ...extractResult,
    recordCount: acceptedRecords.length,
    totalAmount: acceptedRecords
      .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
      .toFixed(2),
    records,
  };
}
