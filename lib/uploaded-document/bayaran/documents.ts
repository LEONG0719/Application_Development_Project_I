import { Prisma } from "@prisma/client";

import type { ExtractedBayaranRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import {
  getAppTimeZoneDateParts,
  parseDateOnlyInAppTimeZone,
} from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { findResidentsByNormalizedIcs } from "@/lib/uploaded-document/shared";

export function getBayaranPaymentDate(paymentMonth: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(paymentMonth)) {
    const date = parseDateOnlyInAppTimeZone(paymentMonth.slice(0, 10));

    return date ?? new Date();
  }

  const [monthName, yearText] = paymentMonth.split(/\s+/);
  const monthIndexByName: Record<string, number> = {
    januari: 0,
    january: 0,
    februari: 1,
    february: 1,
    mac: 2,
    march: 2,
    april: 3,
    mei: 4,
    may: 4,
    jun: 5,
    june: 5,
    julai: 6,
    july: 6,
    ogos: 7,
    august: 7,
    september: 8,
    oktober: 9,
    october: 9,
    november: 10,
    disember: 11,
    december: 11,
  };
  const monthIndex = monthIndexByName[monthName?.toLowerCase() ?? ""] ?? 0;
  const year = Number(yearText) || getAppTimeZoneDateParts().year;

  return (
    parseDateOnlyInAppTimeZone(
      `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
    ) ?? new Date()
  );
}

export async function buildBayaranExtractResultFromDraftRows(
  uploadedDocumentId: string,
) {
  const rows = await prisma.paymentDraft.findMany({
    where: { uploadedDocumentId },
    orderBy: [{ createdAt: "asc" }],
  });

  if (rows.length === 0) {
    return null;
  }

  const residentIdByIc = await findResidentsByNormalizedIcs(
    prisma,
    rows.map((row) => row.residentIcNumber),
  );
  const preparedRows = rows.map((row) => ({
    row,
    residentId:
      residentIdByIc.get(normalizeIc(row.residentIcNumber)) ?? null,
    receiptNo: normalizeReceiptNo(row.receiptNo ?? row.referenceNo),
  }));
  const existingPaymentKeys = await findExistingPaymentKeys(preparedRows);

  await updatePaymentDraftResidentReferences(
    preparedRows
      .filter(({ row, residentId }) => row.originalResidentId !== residentId)
      .map(({ row, residentId }) => ({ draftId: row.id, residentId })),
  );

  const records = preparedRows.map(({ row, residentId, receiptNo }) =>
    buildBayaranRecord(
      row,
      residentId,
      existingPaymentKeys.has(
        getPaymentKey({
          residentId,
          paymentDate: row.paymentDate,
          receiptNo,
          amount: row.amount,
        }),
      ),
    ),
  );

  const totalAmount = records
    .reduce((total, record) => total + Number(record.amaunRm || 0), 0)
    .toFixed(2);

  return {
    documentType: "bayaran" as const,
    recordCount: records.length,
    totalAmount,
    paymentMonth: rows[0]?.paymentDate.toISOString() ?? "",
    records,
  };
}

type BayaranDraftRow = Awaited<
  ReturnType<typeof prisma.paymentDraft.findMany>
>[number];

function buildBayaranRecord(
  row: BayaranDraftRow,
  residentId: string | null,
  paymentExists: boolean,
) {
  return {
    paymentId: row.id,
    residentId: residentId ?? undefined,
    isExisted: paymentExists,
    page: 0,
    jabatanCode: "",
    jabatanName: row.department ?? "",
    ptjpkCode: "",
    ptjpkName: "",
    bil: "",
    noRujukan: row.receiptNo ?? row.referenceNo ?? "",
    noGajiNoKp: row.residentIcNumber,
    nama: row.residentName,
    amaunRm: row.amount.toFixed(2),
    tarikh: row.paymentDate.toISOString(),
    noResit: row.receiptNo ?? row.referenceNo ?? "",
    catatan: row.description ?? "",
  } satisfies ExtractedBayaranRecord;
}

type PreparedBayaranDraftRow = {
  row: BayaranDraftRow;
  residentId: string | null;
  receiptNo: string | null;
};

async function findExistingPaymentKeys(rows: PreparedBayaranDraftRow[]) {
  const residentIds = [
    ...new Set(
      rows
        .map((row) => row.residentId)
        .filter((residentId): residentId is string => Boolean(residentId)),
    ),
  ];
  const receiptNos = [
    ...new Set(
      rows
        .map((row) => row.receiptNo)
        .filter((receiptNo): receiptNo is string => Boolean(receiptNo)),
    ),
  ];
  const paymentDates = [
    ...new Map(
      rows.map((row) => [
        row.row.paymentDate.toISOString(),
        row.row.paymentDate,
      ]),
    ).values(),
  ];

  if (
    residentIds.length === 0 ||
    receiptNos.length === 0 ||
    paymentDates.length === 0
  ) {
    return new Set<string>();
  }

  const payments = await prisma.payment.findMany({
    where: {
      residentId: { in: residentIds },
      receiptNo: { in: receiptNos },
      paymentDate: { in: paymentDates },
    },
    select: {
      residentId: true,
      paymentDate: true,
      receiptNo: true,
      amount: true,
    },
  });

  return new Set(payments.map(getPaymentKey).filter(Boolean));
}

async function updatePaymentDraftResidentReferences(
  updates: { draftId: string; residentId: string | null }[],
) {
  if (updates.length === 0) {
    return;
  }

  await prisma.$executeRaw`
    UPDATE "PaymentDraft" AS draft
    SET
      "originalResidentId" = updates."residentId",
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        updates.map(
          (update) =>
            Prisma.sql`(${update.draftId}::uuid, ${update.residentId}::uuid)`,
        ),
      )}
    ) AS updates("id", "residentId")
    WHERE draft."id" = updates."id"
  `;
}

function getPaymentKey(input: {
  residentId: string | null | undefined;
  paymentDate: Date | null | undefined;
  receiptNo: string | null | undefined;
  amount: Prisma.Decimal | string | number | null | undefined;
}) {
  const receiptNo = normalizeReceiptNo(input.receiptNo);

  if (!input.residentId || !input.paymentDate || !receiptNo || input.amount == null) {
    return "";
  }

  return [
    input.residentId,
    input.paymentDate.toISOString(),
    receiptNo,
    Number(input.amount).toFixed(2),
  ].join("|");
}

function normalizeIc(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeReceiptNo(value: string | null | undefined) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();

  return normalized || null;
}
