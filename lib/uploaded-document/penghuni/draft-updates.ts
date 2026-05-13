import type { Prisma } from "@prisma/client";

import type { ExtractedPenghuniRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { rawData } from "@/lib/uploaded-document/shared";

export async function updatePenghuniDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  records: ExtractedPenghuniRecord[],
) {
  const nextIds = new Set<string>(
    records
      .map((record) => record.residentId)
      .filter((value): value is string => typeof value === "string"),
  );

  await tx.residentDraft.deleteMany({
    where: { uploadedDocumentId, id: { notIn: [...nextIds] } },
  });

  for (const record of records) {
    if (!record.residentId) {
      continue;
    }

    await tx.residentDraft.updateMany({
      where: { id: record.residentId, uploadedDocumentId },
      data: {
        fullName: record.nama,
        icNumber: record.noKadPengenalan,
        phone: record.perhubungan || null,
        position: record.pekerjaan || null,
        department: record.jabatan || null,
        description: record.alamatKuarters || null,
        rawData: rawData(record),
      },
    });
  }
}
