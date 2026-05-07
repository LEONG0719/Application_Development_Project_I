"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "../../../../../constants/routes";
import {
  CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
} from "../../../components/extract-review-shared";
import type {
  BayaranExtractResult,
  ExtractedBayaranRecord,
  ExtractedTunggakanRecord,
  ExtractResult,
  TunggakanExtractResult,
} from "../../../components/extract-review-shared";
import { getReviewContent } from "./review_page_components/get-review-content";
import ReviewActions from "./review_page_components/ReviewActions";
import ReviewHeader from "./review_page_components/ReviewHeader";
import ReviewPreviewPanel from "./review_page_components/ReviewPreviewPanel";
import {
  notifySessionStorageChange,
  subscribeToSessionStorage,
} from "./review_page_components/session-storage";
import StatCards from "./review_page_components/StatCards";
import type {
  ReviewKind,
  VerifyingMode,
} from "./review_page_components/types";

export type { ReviewKind } from "./review_page_components/types";

export default function ExtractReviewPage({ kind }: { kind: ReviewKind }) {
  const router = useRouter();
  const [bayaranEditedTotalAmount, setBayaranEditedTotalAmount] = useState<
    string | null
  >(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verifyingMode, setVerifyingMode] = useState<VerifyingMode | null>(null);
  const [selectedRecordKeys, setSelectedRecordKeys] = useState<string[]>([]);
  const storedExtract = useSyncExternalStore(
    subscribeToSessionStorage,
    () => window.sessionStorage.getItem(`${kind}ExtractResult`) ?? "",
    () => "",
  );
  const uploadedFileName = useSyncExternalStore(
    subscribeToSessionStorage,
    () => window.sessionStorage.getItem(`${kind}ExtractFileName`) ?? "",
    () => "",
  );

  const extractResult = useMemo(() => {
    if (!storedExtract) {
      return null;
    }

    try {
      return JSON.parse(storedExtract) as ExtractResult;
    } catch {
      return null;
    }
  }, [storedExtract]);
  const bayaranExtract =
    extractResult?.documentType === "bayaran" ? extractResult : null;
  const penghuniExtract =
    extractResult?.documentType === "penghuni" ? extractResult : null;
  const kuartersExtract =
    extractResult?.documentType === "kuarters" ? extractResult : null;
  const tunggakanExtract =
    extractResult?.documentType === "tunggakan" ? extractResult : null;

  const updateCurrentBayaranDraft = async (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => {
    if (!bayaranExtract) {
      return;
    }

    const nextExtract: BayaranExtractResult = {
      ...bayaranExtract,
      recordCount: records.length,
      totalAmount,
      records,
    };
    const draftId = window.sessionStorage.getItem(
      CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
    );

    window.sessionStorage.setItem("bayaranExtractResult", JSON.stringify(nextExtract));
    notifySessionStorageChange();

    if (!draftId) {
      return;
    }

    await fetch(`/api/uploaded-documents/${draftId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractResult: nextExtract,
      }),
    });
  };

  const updateCurrentTunggakanDraft = async (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => {
    if (!tunggakanExtract) {
      return;
    }

    const nextExtract: TunggakanExtractResult = {
      ...tunggakanExtract,
      recordCount: records.length,
      totalAmount,
      records,
    };
    const draftId = window.sessionStorage.getItem(
      CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
    );

    window.sessionStorage.setItem(
      "tunggakanExtractResult",
      JSON.stringify(nextExtract),
    );
    notifySessionStorageChange();

    if (!draftId) {
      return;
    }

    await fetch(`/api/uploaded-documents/${draftId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        extractResult: nextExtract,
      }),
    });
  };

  const handleReviewLater = () => {
    router.push(ROUTES.muatNaik);
  };

  const handleVerifyData = async (mode: VerifyingMode) => {
    if (verifyingMode) {
      return;
    }

    const draftId = window.sessionStorage.getItem(
      CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
    );

    if (!draftId) {
      setVerificationMessage("Dokumen semakan tidak ditemui.");
      return;
    }

    if (mode === "selected" && selectedRecordKeys.length === 0) {
      setVerificationMessage("Sila pilih sekurang-kurangnya satu rekod untuk disahkan.");
      return;
    }

    setVerifyingMode(mode);
    setVerificationMessage("");

    try {
      const response = await fetch(`/api/uploaded-documents/${draftId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body:
          mode === "selected"
            ? JSON.stringify({ selectedKeys: selectedRecordKeys })
            : undefined,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message ?? "Gagal mengesahkan data.");
      }

      if (result?.data?.remainingExtractResult) {
        window.sessionStorage.setItem(
          `${kind}ExtractResult`,
          JSON.stringify(result.data.remainingExtractResult),
        );
        notifySessionStorageChange();
        setSelectedRecordKeys([]);
        setVerificationMessage("Rekod dipilih berjaya disahkan.");
      } else {
        window.sessionStorage.removeItem(CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY);
        window.sessionStorage.removeItem(`${kind}ExtractResult`);
        window.sessionStorage.removeItem(`${kind}ExtractFileName`);
        notifySessionStorageChange();
        router.push(ROUTES.muatNaik);
      }
    } catch (error) {
      setVerificationMessage(
        error instanceof Error ? error.message : "Gagal mengesahkan data.",
      );
    } finally {
      setVerifyingMode(null);
    }
  };

  const content = useMemo(
    () =>
      getReviewContent({
        kind,
        extractResult,
        uploadedFileName,
        bayaranEditedTotalAmount,
      }),
    [kind, extractResult, uploadedFileName, bayaranEditedTotalAmount],
  );

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-8">
        <ReviewHeader
          fileName={content.fileName}
          onReviewLater={handleReviewLater}
        />

        <StatCards stats={content.stats} />

        <ReviewPreviewPanel
          kind={kind}
          bayaranRecords={bayaranExtract?.records ?? []}
          onBayaranTotalAmountChange={setBayaranEditedTotalAmount}
          onBayaranRecordsChange={updateCurrentBayaranDraft}
          penghuniRecords={penghuniExtract?.records ?? []}
          kuartersRecords={kuartersExtract?.records ?? []}
          tunggakanRecords={tunggakanExtract?.records ?? []}
          onTunggakanRecordsChange={updateCurrentTunggakanDraft}
          selectedKeys={selectedRecordKeys}
          onSelectedKeysChange={setSelectedRecordKeys}
        />

        <ReviewActions
          addLabel={content.addLabel}
          verifyingMode={verifyingMode}
          verificationMessage={verificationMessage}
          onVerify={handleVerifyData}
        />
      </div>
    </section>
  );
}
