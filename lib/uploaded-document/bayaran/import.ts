import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type {
  ExtractedBayaranRecord,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { getBayaranPaymentDate } from "@/lib/uploaded-document/bayaran/documents";
import {
  findExistingBayaranPaymentKeys,
  getBayaranPaymentKey,
} from "@/lib/uploaded-document/bayaran/queries";
import { createOrderedTimestamps } from "@/lib/uploaded-document/import-utils";
import { findResidentsByNormalizedIcs } from "@/lib/uploaded-document/shared";

export async function createPendingBayaranRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "bayaran") {
    return extractResult;
  }

  const paymentDate = getBayaranPaymentDate(extractResult.paymentMonth);
  const normalizedRecords: ExtractedBayaranRecord[] = [];
  const seen = new Set<string>();

  for (const record of extractResult.records) {
    const normalizedRecord = normalizeBayaranRecord(record);
    if (!/^\d{12}$/.test(normalizedRecord.noGajiNoKp)) {
      continue;
    }

    if (seen.has(normalizedRecord.noGajiNoKp)) {
      continue;
    }

    seen.add(normalizedRecord.noGajiNoKp);
    normalizedRecords.push(normalizedRecord);
  }

  const residentIdByIc = await findResidentsByNormalizedIcs(
    tx,
    normalizedRecords.map((record) => record.noGajiNoKp),
  );
  const timestamps = createOrderedTimestamps(normalizedRecords.length);
  const preparedRecords = normalizedRecords.map((record, index) => ({
    record,
    draftId: randomUUID(),
    createdAt: timestamps[index],
    residentId: residentIdByIc.get(record.noGajiNoKp) ?? null,
  }));
  const existingPaymentKeys = await findExistingBayaranPaymentKeys(
    tx,
    preparedRecords.map(({ record, residentId }) => ({
      residentId,
      paymentDate,
      receiptNo: record.noRujukan,
      amount: record.amaunRm,
    })),
  );

  if (preparedRecords.length > 0) {
    await tx.paymentDraft.createMany({
      data: preparedRecords.map(({ record, draftId, residentId, createdAt }) => ({
        id: draftId,
        residentName: record.nama,
        residentIcNumber: record.noGajiNoKp,
        department: record.jabatanName || null,
        paymentDate,
        receiptNo: record.noRujukan || null,
        referenceNo: record.noRujukan || null,
        amount: record.amaunRm || "0",
        description: record.catatan || "bayaran",
        uploadedDocumentId,
        originalResidentId: residentId || null,
        createdAt,
        updatedAt: createdAt,
      })),
    });
  }

  const records = preparedRecords.map(({ record, draftId, residentId }) => {
    const paymentKey = getBayaranPaymentKey({
      residentId,
      paymentDate,
      receiptNo: record.noRujukan,
      amount: record.amaunRm,
    });

    return {
      ...record,
      paymentId: draftId,
      residentId: residentId || undefined,
      isExisted: Boolean(paymentKey && existingPaymentKeys.has(paymentKey)),
    };
  });

  return {
    ...extractResult,
    recordCount: records.length,
    totalAmount: records
      .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
      .toFixed(2),
    records,
  };
}

function normalizeBayaranRecord(record: ExtractedBayaranRecord): ExtractedBayaranRecord {
  return {
    ...record,
    nama: normalizeText(record.nama),
    noGajiNoKp: normalizeIc(record.noGajiNoKp),
    jabatanName: normalizeText(record.jabatanName || record.ptjpkName),
    ptjpkName: "",
    ptjpkCode: "",
    jabatanCode: "",
    noRujukan: normalizeText(record.noRujukan),
    noResit: normalizeText(record.noRujukan),
    amaunRm: normalizeAmount(record.amaunRm),
    tarikh: normalizeText(record.tarikh),
    catatan: normalizeText(record.catatan) || "bayaran",
  };
}

function normalizeText(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeIc(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeAmount(value: string) {
  const amount = Number(
    String(value ?? "")
      .replace(/RM/gi, "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}
