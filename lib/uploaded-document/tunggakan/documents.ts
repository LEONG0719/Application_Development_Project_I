import { Prisma } from "@prisma/client";

import type { ExtractedTunggakanRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import type { ReviewBuildOptions } from "@/lib/uploaded-document/documents";
import { findResidentsByNormalizedIcs } from "@/lib/uploaded-document/shared";

export async function buildTunggakanExtractResultFromDraftRows(
  uploadedDocumentId: string,
  options: ReviewBuildOptions = {},
) {
  const rows = await prisma.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const residentIdByIc = await findResidentsByNormalizedIcs(
    prisma,
    rows
      .filter((row) => !row.originalResidentId)
      .map((row) => row.residentIcNumber),
  );
  const preparedRows = rows.map((row) => ({
    row,
    residentId:
      normalizeOptionalUuid(row.originalResidentId) ??
      residentIdByIc.get(normalizeIc(row.residentIcNumber)) ??
      null,
  }));
  const residentIds = [
    ...new Set(
      preparedRows
        .map((row) => row.residentId)
        .filter((residentId): residentId is string => Boolean(residentId)),
    ),
  ];
  const storedSummaryIdByResidentId = new Map(
    rows
      .filter(
        (
          row,
        ): row is typeof row & {
          originalResidentId: string;
          originalSummaryId: string;
        } => Boolean(row.originalResidentId && row.originalSummaryId),
      )
      .map((row) => [row.originalResidentId, row.originalSummaryId]),
  );
  const summaryResidentIdsToRefresh = options.useStoredReferences
    ? residentIds.filter(
        (residentId) => !storedSummaryIdByResidentId.has(residentId),
      )
    : residentIds;
  const [transactionResidentIds, refreshedSummaryIdByResidentId] =
    await Promise.all([
    findTransactionResidentIds(residentIds),
    findSummaryIdsByResidentId(summaryResidentIdsToRefresh),
  ]);
  const summaryIdByResidentId = new Map([
    ...storedSummaryIdByResidentId,
    ...refreshedSummaryIdByResidentId,
  ]);
  const referenceUpdates: {
    draftId: string;
    residentId: string | null;
    summaryId: string | null;
  }[] = [];
  const records = preparedRows.map(({ row, residentId }) => {
    const summaryId = residentId
      ? summaryIdByResidentId.get(residentId) ?? null
      : null;
    const hasTransactions = Boolean(
      residentId && transactionResidentIds.has(residentId),
    );
    const isBlocked = Boolean(hasTransactions || summaryId);
    const importMessage = hasTransactions
      ? "Penghuni ini sudah mempunyai transaksi dalam sistem."
      : summaryId
        ? "Rekod tunggakan telah wujud dalam sistem."
        : undefined;

    if (
      row.originalResidentId !== residentId ||
      row.originalSummaryId !== summaryId
    ) {
      referenceUpdates.push({
        draftId: row.id,
        residentId,
        summaryId,
      });
    }

    return buildTunggakanRecord(row, residentId, isBlocked, importMessage);
  });

  if (!options.useStoredReferences) {
    await updateTunggakanDraftReferences(referenceUpdates);
  }
  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    documentType: "tunggakan" as const,
    recordCount: acceptedRecords.length,
    lastUpdatedMonth: rows[0]?.lastUpdatedMonth?.toISOString(),
    totalAmount: sumSignedTunggakanAmounts(acceptedRecords),
    records,
  };
}

type TunggakanDraftRow = Awaited<
  ReturnType<typeof prisma.arrearsSummaryDraft.findMany>
>[number];

function buildTunggakanRecord(
  row: TunggakanDraftRow,
  residentId: string | null,
  isBlocked: boolean,
  importMessage?: string,
) {
  return {
    arrearsSummaryId: row.id,
    residentId: residentId ?? undefined,
    isExisted: isBlocked,
    importStatus: isBlocked ? "IGNORED" : "PENDING",
    importMessage,
    nama: row.residentName,
    noKadPengenalan: row.residentIcNumber,
    jumlahTunggakan: formatSignedDecimal(row.totalArrearsAmount),
  } satisfies ExtractedTunggakanRecord;
}

async function findTransactionResidentIds(residentIds: string[]) {
  if (residentIds.length === 0) {
    return new Set<string>();
  }

  const transactions = await prisma.transaction.findMany({
    where: { residentId: { in: residentIds } },
    select: { residentId: true },
    distinct: ["residentId"],
  });

  return new Set(
    transactions
      .map((transaction) => transaction.residentId)
      .filter((residentId): residentId is string => Boolean(residentId)),
  );
}

async function findSummaryIdsByResidentId(residentIds: string[]) {
  if (residentIds.length === 0) {
    return new Map<string, string>();
  }

  const summaries = await prisma.arrearsSummary.findMany({
    where: { residentId: { in: residentIds } },
    select: { id: true, residentId: true },
  });

  return new Map(
    summaries.map((summary) => [summary.residentId, summary.id]),
  );
}

async function updateTunggakanDraftReferences(
  updates: {
    draftId: string;
    residentId: string | null;
    summaryId: string | null;
  }[],
) {
  if (updates.length === 0) {
    return;
  }

  await prisma.$executeRaw`
    UPDATE "ArrearsSummaryDraft" AS draft
    SET
      "originalResidentId" = updates."residentId",
      "originalSummaryId" = updates."summaryId",
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        updates.map(
          (update) =>
            Prisma.sql`(
              ${update.draftId}::uuid,
              ${update.residentId}::uuid,
              ${update.summaryId}::uuid
            )`,
        ),
      )}
    ) AS updates("id", "residentId", "summaryId")
    WHERE draft."id" = updates."id"
  `;
}

function normalizeOptionalUuid(value: string | null | undefined) {
  return value?.trim() ? value : null;
}

function normalizeIc(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatSignedDecimal(value: { toString: () => string }) {
  const amount = Number(value.toString());

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function sumSignedTunggakanAmounts(records: ExtractedTunggakanRecord[]) {
  return records
    .reduce((total, record) => total + parseSignedAmount(record.jumlahTunggakan), 0)
    .toFixed(2);
}

function parseSignedAmount(value: string) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return 0;
  }

  const normalizedSign = normalizedValue.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalizedSign);
  const hasNegativeSign = normalizedSign.includes("-");
  const numericValue = Number(
    normalizedSign
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return (isParenthesizedNegative || hasNegativeSign) && numericValue > 0
    ? numericValue * -1
    : numericValue;
}
