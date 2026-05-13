import type { Prisma } from "@prisma/client";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { rawData } from "@/lib/uploaded-document/shared";

export async function updateTunggakanDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: Extract<ExtractResult, { documentType: "tunggakan" }>,
) {
  const nextIds = new Set<string>(
    extractResult.records
      .map((record) => record.arrearsSummaryId)
      .filter((value): value is string => typeof value === "string"),
  );

  await tx.arrearsSummaryDraft.deleteMany({
    where: { uploadedDocumentId, id: { notIn: [...nextIds] } },
  });

  for (const record of extractResult.records) {
    if (!record.arrearsSummaryId) {
      continue;
    }

    await tx.arrearsSummaryDraft.updateMany({
      where: { id: record.arrearsSummaryId, uploadedDocumentId },
      data: {
        residentName: record.nama,
        residentIcNumber: record.noKadPengenalan,
        totalArrearsAmount: record.jumlahTunggakan || "0",
        description: "tunggakan",
        rawData: rawData(record),
      },
    });
  }
}
