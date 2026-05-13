import type { UploadedDocument } from "@prisma/client";

import type {
  ExtractResult,
  ProcessingDraft,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { buildBayaranExtractResultFromDraftRows } from "@/lib/uploaded-document/bayaran/documents";
import { buildKuartersExtractResultFromDraftRows } from "@/lib/uploaded-document/kuarters/documents";
import { buildPenghuniExtractResultFromDraftRows } from "@/lib/uploaded-document/penghuni/documents";
import { buildTunggakanExtractResultFromDraftRows } from "@/lib/uploaded-document/tunggakan/documents";

export type UploadedDocumentWithUploader = UploadedDocument & {
  uploadedBy?: {
    fullName: string;
  } | null;
};

export async function mapUploadedDocumentForReview(
  document: UploadedDocumentWithUploader,
): Promise<ProcessingDraft | null> {
  const extractResult = await buildExtractResultFromDraftRows(document);

  if (!extractResult) {
    return null;
  }

  return {
    id: document.id,
    kind: extractResult.documentType,
    fileName: document.originalName ?? document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    uploadedBy: document.uploadedBy?.fullName ?? "Username",
    uploadedAt: document.uploadedAt.toISOString(),
    extractResult,
  };
}

async function buildExtractResultFromDraftRows(
  document: UploadedDocumentWithUploader,
): Promise<ExtractResult | null> {
  if (document.category === "BAYARAN") {
    return buildBayaranExtractResultFromDraftRows(document.id);
  }

  if (document.category === "TUNGGAKAN") {
    return buildTunggakanExtractResultFromDraftRows(document.id);
  }

  if (document.category === "PENGHUNI") {
    return buildPenghuniExtractResultFromDraftRows(document.id);
  }

  if (document.category === "KUARTERS") {
    return buildKuartersExtractResultFromDraftRows(document.id);
  }

  return null;
}
