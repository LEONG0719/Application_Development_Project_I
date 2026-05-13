import type { Prisma } from "@prisma/client";

import type { VerifyResult } from "@/lib/uploaded-document/verification";
import { ensureResidentFromDraft } from "@/lib/uploaded-document/shared";

export async function verifyTunggakanDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const drafts = await tx.arrearsSummaryDraft.findMany({
    where: { uploadedDocumentId, id: { in: selectedKeys } },
  });
  const failedMessages: string[] = [];
  let verifiedRows = 0;

  for (const draft of drafts) {
    const residentId = await ensureResidentFromDraft(tx, {
      fullName: draft.residentName,
      icNumber: draft.residentIcNumber,
    });
    const existingSummary = await tx.arrearsSummary.findUnique({
      where: { residentId },
      select: { id: true },
    });

    if (existingSummary) {
      failedMessages.push(`Tunggakan ${draft.residentName} telah wujud.`);
      await tx.arrearsSummaryDraft.update({
        where: { id: draft.id },
        data: { isExisted: true, originalSummaryId: existingSummary.id },
      });
      continue;
    }

    await tx.arrearsSummary.create({
      data: {
        residentId,
        totalArrearsAmount: draft.totalArrearsAmount,
        description: draft.description,
      },
    });
    await tx.arrearsSummaryDraft.delete({ where: { id: draft.id } });
    verifiedRows += 1;
  }

  return { verifiedRows, failedMessages };
}
