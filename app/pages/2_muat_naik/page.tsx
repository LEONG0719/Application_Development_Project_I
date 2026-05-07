"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "../../constants/routes";
import CategoryTabs from "./components/CategoryTabs";
import ProcessingQueueTable from "./components/ProcessingQueueTable";
import UploadDropzone from "./components/UploadDropzone";
import { draftKindByCategory, reviewRoutes } from "./components/constants";
import {
  CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY,
  type ExtractResult,
  type ProcessingDraft,
} from "./components/extract-review-shared";
import type { Category } from "./components/types";

export default function MuatNaikPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>("Bayaran");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [processingDrafts, setProcessingDrafts] = useState<ProcessingDraft[]>(
    [],
  );
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeDraftKind = draftKindByCategory[activeCategory];
  const activeRows = useMemo(
    () =>
      activeDraftKind
        ? processingDrafts.filter((draft) => draft.kind === activeDraftKind)
        : [],
    [activeDraftKind, processingDrafts],
  );

  // Load processing drafts when active category changes or on initial mount
  useEffect(() => {
    async function loadProcessingDrafts() {
      if (!activeDraftKind) {
        setProcessingDrafts([]);
        return;
      }

      setIsLoadingQueue(true);

      try {
        const category = activeDraftKind.toUpperCase();
        const response = await fetch(`/api/uploaded-documents?category=${category}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.message ?? "Gagal mendapatkan barisan pemprosesan.");
        }

        setProcessingDrafts(result.data?.documents ?? []);
      } catch (error) {
        setProcessingError(
          error instanceof Error
            ? error.message
            : "Gagal mendapatkan barisan pemprosesan.",
        );
        setProcessingDrafts([]);
      } finally {
        setIsLoadingQueue(false);
      }
    }

    void loadProcessingDrafts();
  }, [activeDraftKind]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Handler for file selection button click
  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  // Handler for file input change event
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? "");
    setSelectedFile(file ?? null);
    setProcessingError("");
    setProcessingProgress(0);
    setProcessingStage("");
  }

  function handleClearSelectedFile() {
    setSelectedFileName("");
    setSelectedFile(null);
    setProcessingError("");
    setProcessingProgress(0);
    setProcessingStage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Handler for upload button click - initiates file processing
  async function handleUploadAction() {
    if (!selectedFile) {
      handleChooseFile();
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsProcessing(true);
    setProcessingStep("Mengekstrak data daripada dokumen...");
    setProcessingError("");
    setProcessingProgress(8);
    setProcessingStage("Menyediakan fail untuk kenal pasti...");

    const progressTimer = window.setInterval(() => {
      setProcessingProgress((currentProgress) => {
        if (currentProgress >= 88) {
          return currentProgress;
        }

        return currentProgress + (currentProgress < 55 ? 4 : 2);
      });
    }, 700);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const apiBaseUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? "http://127.0.0.1:8000";
      const extractKind = reviewRoutes[activeCategory];
      setProcessingProgress(18);
      setProcessingStage(`Mengekstrak data ${extractKind}...`);
      const response = await fetch(`${apiBaseUrl}/extract/${extractKind}`, {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(
          errorBody?.detail ?? `Gagal mengekstrak data ${extractKind}.`,
        );
      }

      const extractedData = await response.json();
      const saveResponse = await fetch("/api/uploaded-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: extractKind,
          fileName: selectedFile.name,
          fileType: selectedFile.type || selectedFile.name.split(".").pop() || "file",
          fileSize: selectedFile.size,
          extractResult: extractedData as ExtractResult,
        }),
        signal: abortController.signal,
      });
      const saveResult = await saveResponse.json();

      if (!saveResponse.ok || !saveResult.data?.document) {
        throw new Error(
          saveResult?.message ?? "Gagal menyimpan dokumen ke pangkalan data.",
        );
      }

      const draft = saveResult.data.document as ProcessingDraft;
      setProcessingProgress(96);
      setProcessingStage("Membuka halaman semakan...");
      setProcessingDrafts((currentDrafts) => [draft, ...currentDrafts]);
      sessionStorage.setItem(CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY, draft.id);
      sessionStorage.setItem(
        `${extractKind}ExtractResult`,
        JSON.stringify(draft.extractResult),
      );
      sessionStorage.setItem(`${extractKind}ExtractFileName`, selectedFile.name);
      router.push(`${ROUTES.muatNaik}/semakan/${extractKind}`);
    } catch (error) {
      const extractKind = reviewRoutes[activeCategory];
      if (error instanceof DOMException && error.name === "AbortError") {
        setProcessingError("Proses kenal pasti telah dibatalkan.");
        setProcessingStage("");
        setProcessingProgress(0);
        return;
      }

      setProcessingError(
        error instanceof Error
          ? error.message
          : `Gagal mengekstrak data ${extractKind}.`,
      );
    } finally {
      window.clearInterval(progressTimer);
      abortControllerRef.current = null;
      setIsProcessing(false);
      setProcessingStep("");
    }
  }

  function handleCancelProcessing() {
    abortControllerRef.current?.abort();
  }

  function handleContinueDraft(draft: ProcessingDraft) {
    sessionStorage.setItem(CURRENT_EXTRACT_DRAFT_ID_STORAGE_KEY, draft.id);
    sessionStorage.setItem(
      `${draft.kind}ExtractResult`,
      JSON.stringify(draft.extractResult),
    );
    sessionStorage.setItem(`${draft.kind}ExtractFileName`, draft.fileName);
    router.push(`${ROUTES.muatNaik}/semakan/${draft.kind}`);
  }

  async function handleDeleteDraft(draftId: string) {
    const response = await fetch(`/api/uploaded-documents/${draftId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setProcessingError(result?.message ?? "Gagal memadam dokumen.");
      return;
    }

    setProcessingDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId),
    );
  }

  return (
    <section className="min-h-full bg-background">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-extrabold leading-tight text-[#07162F]">
            Muat Naik Document
          </h1>
          <p className="text-[15px] font-medium text-[#667085]">
            Sila muat naik fail untuk pemprosesan maklumat sistem.
          </p>
        </div>

        <CategoryTabs
          activeCategory={activeCategory}
          disabled={isProcessing}
          onCategoryChange={setActiveCategory}
        />

        <UploadDropzone
          fileInputRef={fileInputRef}
          selectedFileName={selectedFileName}
          isProcessing={isProcessing}
          processingStep={processingStep}
          processingStage={processingStage}
          processingProgress={processingProgress}
          processingError={processingError}
          onFileChange={handleFileChange}
          onUploadAction={handleUploadAction}
          onClearSelectedFile={handleClearSelectedFile}
          onCancelProcessing={handleCancelProcessing}
        />

        <ProcessingQueueTable
          activeCategory={activeCategory}
          rows={activeRows}
          isLoading={isLoadingQueue}
          onContinueDraft={handleContinueDraft}
          onDeleteDraft={handleDeleteDraft}
        />
      </div>
    </section>
  );
}
