import { Prisma } from "@prisma/client";

import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import type { ReviewBuildOptions } from "@/lib/uploaded-document/documents";
import {
  findExactPenghuniMatches,
  type PenghuniExactMatchInput,
} from "@/lib/uploaded-document/penghuni/queries";

export async function buildPenghuniExtractResultFromDraftRows(
  uploadedDocumentId: string,
  options: ReviewBuildOptions = {},
) {
  const rows = await prisma.residentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const records: PenghuniExactMatchInput[] = [];

  for (const row of rows) {
    const record: ExtractedPenghuniRecord = {
      residentId: row.id,
      originalResidentId: row.originalResidentId ?? undefined,
      isExisted: false,
      nama: row.fullName,
      noKadPengenalan: row.icNumber,
      kuarters: row.quarterCategoryName ?? "",
      unit: row.unitCode ?? "",
      alamatKuarters: row.quarterAddress ?? "",
      perhubungan: row.phone ?? "",
      gmail: row.email ?? "",
      pekerjaan: row.position ?? "",
      jabatan: row.department ?? "",
      tarafPerkhidmatan: row.serviceLevel ?? "",
      tarikhMasuk: row.moveInDate?.toISOString() ?? "",
      tarikhKeluar: row.moveOutDate?.toISOString() ?? "",
      catatan: row.description ?? "",
    };
    records.push({
      ...record,
      residentId: row.id,
      originalResidentId: row.originalResidentId ?? undefined,
    });
  }

  if (options.useStoredReferences) {
    const recordsMissingReferences = records.filter(
      (record) => !record.originalResidentId,
    );
    const missingExactMatches =
      recordsMissingReferences.length > 0
        ? await findExactPenghuniMatches(prisma, recordsMissingReferences)
        : new Map();

    return {
      documentType: "penghuni" as const,
      recordCount: records.length,
      records: records.map((record) => {
        const fallbackMatch = missingExactMatches.get(record.residentId);
        const originalResidentId =
          record.originalResidentId ?? fallbackMatch?.residentId;

        return {
          ...record,
          originalResidentId,
          isExisted: Boolean(originalResidentId),
        };
      }),
    };
  }

  const exactMatches = await findExactPenghuniMatches(prisma, records);
  const referenceUpdates = rows
    .map((row) => {
      const exactMatch = exactMatches.get(row.id);

      if (exactMatch?.residentId === row.originalResidentId) {
        return null;
      }

      return {
        draftId: row.id,
        residentId: exactMatch?.residentId ?? null,
      };
    })
    .filter(
      (
        update,
      ): update is {
        draftId: string;
        residentId: string | null;
      } => update !== null,
    );

  if (referenceUpdates.length > 0) {
    await prisma.$executeRaw`
      UPDATE "ResidentDraft" AS draft
      SET
        "originalResidentId" = updates."residentId",
        "updatedAt" = NOW()
      FROM (
        VALUES ${Prisma.join(
          referenceUpdates.map(
            (update) =>
              Prisma.sql`(${update.draftId}::uuid, ${update.residentId}::uuid)`,
          ),
        )}
      ) AS updates("id", "residentId")
      WHERE draft."id" = updates."id"
    `;
  }

  return {
    documentType: "penghuni" as const,
    recordCount: records.length,
    records: records.map((record) => {
      const exactMatch = exactMatches.get(record.residentId);

      return {
        ...record,
        originalResidentId: exactMatch?.residentId ?? undefined,
        isExisted: Boolean(exactMatch),
      };
    }),
  };
}
