import { notFound, redirect } from "next/navigation";

import ExtractReviewPage, {
  type ReviewKind,
} from "./components/ExtractReviewPage";
import { ROUTES } from "../../../../constants/routes";
import { prisma } from "@/lib/prisma";
import { mapUploadedDocumentForReview } from "@/lib/uploaded-document/documents";

const reviewKinds = new Set<string>([
  "bayaran",
  "tunggakan",
  "penghuni",
  "kuarters",
]);

type SemakanEkstrakPageProps = {
  params: Promise<{
    jenis: string;
  }>;
  searchParams: Promise<{
    draftId?: string;
  }>;
};

export default async function SemakanEkstrakPage({
  params,
  searchParams,
}: SemakanEkstrakPageProps) {
  const { jenis } = await params;
  const { draftId = "" } = await searchParams;

  if (!reviewKinds.has(jenis)) {
    notFound();
  }

  const kind = jenis as ReviewKind;
  const uploadPageForKind = `${ROUTES.muatNaik}?kategori=${encodeURIComponent(kind)}`;

  if (!draftId) {
    redirect(uploadPageForKind);
  }

  const document = await prisma.uploadedDocument.findUnique({
    where: { id: draftId },
    include: { uploadedBy: { select: { fullName: true } } },
  });

  if (!document) {
    redirect(uploadPageForKind);
  }

  const reviewDraft = await mapUploadedDocumentForReview(document, {
    useStoredReferences: true,
  });

  if (!reviewDraft || reviewDraft.kind !== kind) {
    redirect(uploadPageForKind);
  }

  return (
    <ExtractReviewPage
      draftId={draftId}
      kind={kind}
      initialDraft={reviewDraft}
    />
  );
}
