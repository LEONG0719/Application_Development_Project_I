import type { Prisma } from "@prisma/client";

import type {
  ExtractedPenghuniRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  findResidentByNormalizedIc,
  rawData,
} from "@/lib/uploaded-document/shared";

export async function createPendingPenghuniRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "penghuni") {
    return extractResult;
  }

  const records: ExtractedPenghuniRecord[] = [];

  for (const record of extractResult.records) {
    const residentId = await findResidentByNormalizedIc(
      tx,
      record.noKadPengenalan,
    );
    const draft = await tx.residentDraft.create({
      data: {
        fullName: record.nama,
        icNumber: record.noKadPengenalan.trim(),
        phone: record.perhubungan || null,
        position: record.pekerjaan || null,
        department: record.jabatan || null,
        description: record.alamatKuarters || null,
        uploadedDocumentId,
        originalResidentId: residentId || null,
        isExisted: Boolean(residentId),
        rawData: rawData(record),
      },
    });

    records.push({
      ...record,
      residentId: draft.id,
      originalResidentId: residentId || undefined,
      isExisted: draft.isExisted,
    });
  }

  return { ...extractResult, recordCount: records.length, records };
}
