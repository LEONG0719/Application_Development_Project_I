import type { Prisma } from "@prisma/client";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import type { VerifyResult } from "@/lib/uploaded-document/verification";
import {
  findResidentByNormalizedIc,
} from "@/lib/uploaded-document/shared";

export async function verifyPenghuniDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.residentDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  let verifiedRows = 0;
  const verifiedRecords: ExtractResult = {
    documentType: "penghuni",
    recordCount: 0,
    records: [],
  };

  for (const draft of drafts) {
    const existingResidentId = await findResidentByNormalizedIc(tx, draft.icNumber);

    if (existingResidentId) {
      failedMessages.push(`Penghuni ${draft.fullName} telah wujud.`);
      await tx.residentDraft.update({
        where: { id: draft.id },
        data: { isExisted: true, originalResidentId: existingResidentId },
      });
      continue;
    }

    const resident = await tx.resident.create({
      data: {
        fullName: draft.fullName,
        icNumber: draft.icNumber,
        phone: draft.phone,
        position: draft.position,
        department: draft.department,
        serviceLevel: draft.serviceLevel,
        status: draft.status,
        description: draft.description,
      },
      select: { id: true },
    });
    const rawRecord =
      draft.rawData && typeof draft.rawData === "object" && !Array.isArray(draft.rawData)
        ? draft.rawData
        : {};

    verifiedRecords.records.push({
      ...rawRecord,
      originalResidentId: resident.id,
      nama: draft.fullName,
      noKadPengenalan: draft.icNumber,
      kuarters: "kuarters" in rawRecord ? String(rawRecord.kuarters) : "",
      unit: "unit" in rawRecord ? String(rawRecord.unit) : "",
      alamatKuarters: draft.description ?? "",
      perhubungan: draft.phone ?? "",
      pekerjaan: draft.position ?? "",
      jabatan: draft.department ?? "",
      sourceSheet: "sourceSheet" in rawRecord ? String(rawRecord.sourceSheet) : "",
      sourceRow: "sourceRow" in rawRecord ? Number(rawRecord.sourceRow) : 0,
    });
    await tx.residentDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  verifiedRecords.recordCount = verifiedRecords.records.length;
  await applyVerifiedPenghuniOccupancy(tx, verifiedRecords);

  return { verifiedRows, failedMessages };
}

async function applyVerifiedPenghuniOccupancy(
  tx: Prisma.TransactionClient,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "penghuni") {
    return;
  }

  const touchedUnitIds = new Set<string>();

  for (const record of extractResult.records) {
    const residentId =
      "originalResidentId" in record && typeof record.originalResidentId === "string"
        ? record.originalResidentId
        : await findResidentByNormalizedIc(tx, record.noKadPengenalan);

    if (!residentId) {
      continue;
    }

    const unitId = await findUnitIdForPenghuniRecord(tx, record.kuarters, record.unit);

    if (!unitId) {
      continue;
    }

    touchedUnitIds.add(unitId);

    await tx.$executeRaw`
      UPDATE "UnitOccupancy"
      SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", NOW()), "updatedAt" = NOW()
      WHERE "residentId" = ${residentId}::uuid
        AND "status" = 'CURRENT'::"OccupancyStatus"
        AND "unitId" <> ${unitId}::uuid
    `;

    await tx.$executeRaw`
      UPDATE "UnitOccupancy"
      SET "status" = 'PAST'::"OccupancyStatus", "moveOutDate" = COALESCE("moveOutDate", NOW()), "updatedAt" = NOW()
      WHERE "unitId" = ${unitId}::uuid
        AND "residentId" <> ${residentId}::uuid
        AND "status" = 'CURRENT'::"OccupancyStatus"
    `;

    await tx.$executeRaw`
      INSERT INTO "UnitOccupancy"
        ("id", "residentId", "unitId", "moveInDate", "status", "description", "createdAt", "updatedAt")
      SELECT
        gen_random_uuid(),
        ${residentId}::uuid,
        ${unitId}::uuid,
        ${parsePenghuniMoveInDate(record.tarikhMasuk ?? "")},
        'CURRENT'::"OccupancyStatus",
        ${"Dicipta selepas pengesahan dokumen penghuni."},
        NOW(),
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM "UnitOccupancy"
        WHERE "residentId" = ${residentId}::uuid
          AND "unitId" = ${unitId}::uuid
          AND "status" = 'CURRENT'::"OccupancyStatus"
      )
    `;
  }

  for (const unitId of touchedUnitIds) {
    await tx.unit.update({
      where: { id: unitId },
      data: { status: "OCCUPIED" },
    });
  }
}

async function findUnitIdForPenghuniRecord(
  tx: Prisma.TransactionClient,
  kuarters: string,
  unit: string,
) {
  const normalizedUnit = unit.trim();
  const normalizedKuarters = kuarters.trim();

  if (!normalizedUnit) {
    return "";
  }

  const units = await tx.$queryRaw<{ id: string }[]>`
    SELECT u."id"
    FROM "Unit" u
    INNER JOIN "QuarterCategory" qc
      ON qc."id" = u."categoryId"
    WHERE UPPER(TRIM(u."unitCode")) = UPPER(TRIM(${normalizedUnit}))
      AND (
        ${normalizedKuarters} = ''
        OR UPPER(TRIM(qc."categoryName")) = UPPER(TRIM(${normalizedKuarters}))
        OR UPPER(TRIM(qc."address")) = UPPER(TRIM(${normalizedKuarters}))
      )
    ORDER BY
      CASE
        WHEN UPPER(TRIM(qc."categoryName")) = UPPER(TRIM(${normalizedKuarters})) THEN 0
        WHEN UPPER(TRIM(qc."address")) = UPPER(TRIM(${normalizedKuarters})) THEN 1
        ELSE 2
      END
    LIMIT 1
  `;

  return units[0]?.id ?? "";
}

function parsePenghuniMoveInDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}
