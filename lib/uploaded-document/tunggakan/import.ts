import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type {
  ExtractedTunggakanRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  getTodayDateInAppTimeZone,
  parseDateOnlyInAppTimeZone,
} from "@/lib/date-time";
import { createOrderedTimestamps } from "@/lib/uploaded-document/import-utils";
import { findResidentsByNormalizedIcs } from "@/lib/uploaded-document/shared";

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

  const lastUpdatedMonth = parseTunggakanDate(extractResult.lastUpdatedMonth);
  const seen = new Set<string>();
  const timestamps = createOrderedTimestamps(extractResult.records.length);
  const preparedRecords = extractResult.records.map((record, index) => {
    const icNumber = normalizeIc(record.noKadPengenalan);
    const jumlahTunggakan = normalizeAmount(record.jumlahTunggakan);
    return {
      record: {
        ...record,
        noKadPengenalan: icNumber,
        jumlahTunggakan,
      } satisfies ExtractedTunggakanRecord,
      draftId: randomUUID(),
      createdAt: timestamps[index],
      identityKey: tunggakanIdentityKey(record.nama, icNumber),
    };
  });
  const residentIdByIc = await findResidentsByNormalizedIcs(
    tx,
    preparedRecords.map(({ record }) => record.noKadPengenalan),
  );
  const residentIds = [
    ...new Set(
      [...residentIdByIc.values()].filter((residentId) => Boolean(residentId)),
    ),
  ];
  const existingSummaries = residentIds.length
    ? await tx.arrearsSummary.findMany({
        where: { residentId: { in: residentIds } },
        select: { id: true, residentId: true },
      })
    : [];
  const residentsWithTransactions = residentIds.length
    ? await tx.transaction.findMany({
        where: { residentId: { in: residentIds } },
        select: { residentId: true },
        distinct: ["residentId"],
      })
    : [];
  const summaryIdByResidentId = new Map(
    existingSummaries.map((summary) => [summary.residentId, summary.id]),
  );
  const transactionResidentIds = new Set(
    residentsWithTransactions
      .map((transaction) => transaction.residentId)
      .filter((residentId): residentId is string => Boolean(residentId)),
  );

  if (preparedRecords.length > 0) {
    await tx.arrearsSummaryDraft.createMany({
      data: preparedRecords.map(({ record, draftId, createdAt }) => {
        const residentId =
          residentIdByIc.get(record.noKadPengenalan) ?? null;

        return {
          id: draftId,
          residentName: record.nama,
          residentIcNumber: record.noKadPengenalan,
          totalArrearsAmount: record.jumlahTunggakan,
          lastUpdatedMonth,
          description: "tunggakan",
          uploadedDocumentId,
          originalResidentId: residentId,
          originalSummaryId: residentId
            ? summaryIdByResidentId.get(residentId) ?? null
            : null,
          createdAt,
          updatedAt: createdAt,
        };
      }),
    });
  }

  const records = preparedRecords.map(({ record, draftId, identityKey }) => {
    const residentId =
      residentIdByIc.get(record.noKadPengenalan) ?? null;
    const existingSummaryId = residentId
      ? summaryIdByResidentId.get(residentId)
      : undefined;
    const hasTransactions = Boolean(
      residentId && transactionResidentIds.has(residentId),
    );
    const isDuplicateInDocument = seen.has(identityKey);
    const isBlocked = Boolean(
      hasTransactions || existingSummaryId || isDuplicateInDocument,
    );

    seen.add(identityKey);

    return {
      ...record,
      arrearsSummaryId: draftId,
      residentId: residentId || undefined,
      isExisted: isBlocked,
      importStatus: isBlocked ? "IGNORED" : "PENDING",
      importMessage: isDuplicateInDocument
        ? "Rekod tunggakan pendua dalam fail ini."
        : hasTransactions
          ? "Penghuni ini sudah mempunyai transaksi dalam sistem."
          : existingSummaryId
            ? "Rekod tunggakan telah wujud dalam sistem."
            : undefined,
    } satisfies ExtractedTunggakanRecord;
  });

  const acceptedRecords = records.filter((record) => record.importStatus !== "IGNORED");

  return {
    ...extractResult,
    lastUpdatedMonth: lastUpdatedMonth.toISOString(),
    recordCount: acceptedRecords.length,
    totalAmount: acceptedRecords
      .reduce((total, record) => total + Number(record.jumlahTunggakan || 0), 0)
      .toFixed(2),
    records,
  };
}

function normalizeAmount(value: string) {
  let normalized = String(value ?? "").trim();
  if (!normalized) {
    return "0.00";
  }

  normalized = normalized.replace(/[−–—]/g, "-");
  const isParenthesizedNegative = /^\(.*\)$/.test(normalized);
  const hasNegativeSign = normalized.includes("-");
  const amount = Number(
    normalized
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .replace(/\s+/g, "")
      .replace(/[()]/g, "")
      .replace(/-/g, ""),
  );

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  const signedAmount =
    (isParenthesizedNegative || hasNegativeSign) && amount > 0
      ? amount * -1
      : amount;

  return signedAmount.toFixed(2);
}

function parseTunggakanDate(value: string | undefined) {
  if (!value) {
    throw new Error("Tarikh tunggakan diperlukan sebelum dokumen disimpan.");
  }

  const date = parseDateOnlyInAppTimeZone(value.slice(0, 10));

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error("Tarikh tunggakan tidak sah.");
  }

  if (date > getTodayDateInAppTimeZone()) {
    throw new Error("Tarikh tunggakan tidak boleh melebihi tarikh hari ini.");
  }

  return date;
}

function normalizeIc(value: string) {
  return value.replace(/\D/g, "");
}
