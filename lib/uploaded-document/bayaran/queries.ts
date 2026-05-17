import type { Prisma } from "@prisma/client";

type BayaranPaymentLookupClient = Pick<Prisma.TransactionClient, "payment">;

export async function findExistingBayaranPayment(
  tx: BayaranPaymentLookupClient,
  input: {
    residentId: string | null | undefined;
    paymentDate: Date | null | undefined;
    receiptNo: string | null | undefined;
    amount: Prisma.Decimal | string | number | null | undefined;
  },
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
