import type { Prisma } from "@prisma/client";

type BayaranPaymentLookupClient = Pick<Prisma.TransactionClient, "payment">;

type BayaranPaymentKeyInput = {
  residentId: string | null | undefined;
  paymentDate: Date | null | undefined;
  receiptNo: string | null | undefined;
  amount: Prisma.Decimal | string | number | null | undefined;
};

export async function findExistingBayaranPayment(
  tx: BayaranPaymentLookupClient,
  input: BayaranPaymentKeyInput,
) {
  const receiptNo = input.receiptNo?.trim();

  if (!input.residentId || !input.paymentDate || !receiptNo || input.amount == null) {
    return null;
  }

  return tx.payment.findFirst({
    where: {
      residentId: input.residentId,
      paymentDate: input.paymentDate,
      receiptNo,
      amount: input.amount,
    },
    select: { id: true },
  });
}

export async function findExistingBayaranPaymentKeys(
  tx: BayaranPaymentLookupClient,
  inputs: BayaranPaymentKeyInput[],
) {
  const residentIds = uniqueValues(
    inputs
      .map((input) => input.residentId)
      .filter((residentId): residentId is string => Boolean(residentId)),
  );
  const receiptNos = uniqueValues(
    inputs
      .map((input) => input.receiptNo?.trim())
      .filter((receiptNo): receiptNo is string => Boolean(receiptNo)),
  );
  const paymentDates = [
    ...new Map(
      inputs
        .filter((input) => input.paymentDate)
        .map((input) => [
          input.paymentDate!.toISOString(),
          input.paymentDate as Date,
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

  const payments = await tx.payment.findMany({
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

  return new Set(payments.map(getBayaranPaymentKey).filter(Boolean));
}

export function getBayaranPaymentKey(input: BayaranPaymentKeyInput) {
  const receiptNo = input.receiptNo?.trim();

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

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}
