import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type {
  ExtractedPenghuniRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { parseFlexibleDateOnlyInAppTimeZone } from "@/lib/date-time";
import { createOrderedTimestamps } from "@/lib/uploaded-document/import-utils";
import { findExactPenghuniMatches } from "@/lib/uploaded-document/penghuni/queries";

export async function createPendingPenghuniRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "penghuni") {
    return extractResult;
  }

  const timestamps = createOrderedTimestamps(extractResult.records.length);
  const preparedRecords = extractResult.records.map((record, index) => ({
    record,
    draftId: randomUUID(),
    createdAt: timestamps[index],
  }));
  const exactMatches = await findExactPenghuniMatches(
    tx,
    preparedRecords.map(({ record, draftId }) => ({
      ...record,
      residentId: draftId,
    })),
  );

  if (preparedRecords.length > 0) {
    await tx.residentDraft.createMany({
      data: preparedRecords.map(({ record, draftId, createdAt }) => {
        const exactMatch = exactMatches.get(draftId);

        return {
          id: draftId,
          fullName: record.nama,
          icNumber: record.noKadPengenalan.trim(),
          phone: record.perhubungan || null,
          email: record.gmail || null,
          position: record.pekerjaan || null,
          department: record.jabatan || null,
          serviceLevel: record.tarafPerkhidmatan || null,
          description: record.catatan || null,
          quarterCategoryName: record.kuarters || null,
          quarterAddress: record.alamatKuarters || null,
          unitCode: record.unit || null,
          moveInDate: parseNullableDate(record.tarikhMasuk),
          moveOutDate: parseNullableDate(record.tarikhKeluar),
          uploadedDocumentId,
          originalResidentId: exactMatch?.residentId ?? null,
          createdAt,
          updatedAt: createdAt,
        };
      }),
    });
  }

  const records: ExtractedPenghuniRecord[] = preparedRecords.map(
    ({ record, draftId }) => {
      const exactMatch = exactMatches.get(draftId);

      return {
        ...record,
        residentId: draftId,
        originalResidentId: exactMatch?.residentId,
        isExisted: Boolean(exactMatch),
      };
    },
  );

  return { ...extractResult, recordCount: records.length, records };
}

function parseNullableDate(value: string | undefined) {
  return parseFlexibleDateOnlyInAppTimeZone(value);
}
