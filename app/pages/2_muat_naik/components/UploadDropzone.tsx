import type { ChangeEvent, RefObject } from "react";

import Icon from "../../../components/Icon/Icon";

type UploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFileName: string;
  isProcessing: boolean;
  processingStep: string;
  processingStage: string;
  processingProgress: number | null;
  processingError: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadAction: () => void;
  onClearSelectedFile: () => void;
  onCancelProcessing: () => void;
};

export default function UploadDropzone({
  fileInputRef,
  selectedFileName,
  isProcessing,
  processingStep,
  processingStage,
  processingProgress,
  processingError,
  onFileChange,
  onUploadAction,
  onClearSelectedFile,
  onCancelProcessing,
}: UploadDropzoneProps) {
  return (
    <div className="relative flex min-h-82.5 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface px-6 text-center">
      {/* Processing */}
      {isProcessing ? (
        <div
          className="absolute inset-0 z-10 flex flex-col gap-4 items-center justify-center bg-surface px-6"
          role="status"
          aria-live="polite"
        >
          {/* Icon */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-light-blue" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-dark-blue" />
            <Icon
              icon="document_scanner"
              size={30}
              weight={700}
              className="text-dark-blue"
            />
          </div>

          <div className="flex flex-col gap-1">
          {/* Title */}
          <h2 className="text-[22px] font-bold leading-tight text-content">
            Sedang Memproses Dokumen
          </h2>

          {/* Instruction */}
          <p className="text-sm font-medium leading-6 text-content-muted">
            {processingStep || "Mengekstrak data daripada dokumen..."}
          </p>
        </div>
        
          <div className="w-full max-w-md">
            {/* Processing Stage and Measured Upload Percentage */}
            <div className="flex items-center justify-between gap-4 text-xs font-bold text-content">
              <span className="min-w-0 truncate">{processingStage}</span>
              {processingProgress !== null ? (
                <span>{Math.min(processingProgress, 100)}%</span>
              ) : (
                <span>Sedang diproses</span>
              )}
            </div>

            {/* Progress Bar */}
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-label={
                processingProgress !== null
                  ? "Kemajuan muat naik fail"
                  : "Dokumen sedang diproses"
              }
              aria-valuemin={processingProgress !== null ? 0 : undefined}
              aria-valuemax={processingProgress !== null ? 100 : undefined}
              aria-valuenow={processingProgress ?? undefined}
            >
              {processingProgress !== null ? (
                <div
                  className="h-full rounded-full bg-green transition-[width] duration-150"
                  style={{ width: `${Math.min(processingProgress, 100)}%` }}
                />
              ) : (
                <div className="h-full w-1/3 animate-[upload-processing_1.2s_ease-in-out_infinite] rounded-full bg-green" />
              )}
            </div>
          </div>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancelProcessing}
            className="inline-flex h-9 items-center justify-center gap-1 rounded border border-red/30 bg-surface px-5 text-xs font-bold text-red shadow-sm transition hover:bg-danger-surface"
          >
            <Icon icon="cancel" size={15} weight={400} />
            Batal
          </button>
        </div>
      ) : null}

      {/* Selecting */}
      <div className="flex flex-col items-center justify-center gap-4">
        {/* Icon */}
        <div className="flex h-18 w-18 items-center justify-center rounded-xl bg-light-blue text-dark-blue">
          <Icon icon="cloud_upload" size={38} weight={700} />
        </div>

        <div className="flex flex-col gap-1">
          {/* Title */}
          <h2 className="text-[22px] font-bold leading-tight text-content">
            Muat Naik Fail Di Sini
          </h2>

          {/* Instruction */}
          <div className="text-sm font-medium leading-6 text-content-muted">
            <div>Pastikan fail dalam format PDF atau Excel (.xlsx) sahaja.</div>
            <div>Saiz fail maksimum adalah 25MB.</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center gap-2">
          {/* Upload Button */}
          <button
            type="button"
            onClick={onUploadAction}
            disabled={isProcessing}
            className="flex gap-1 p-4 items-center justify-center rounded-lg bg-dark-blue text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95"
          >
            <Icon
              icon={
                isProcessing
                  ? "progress_activity"
                  : selectedFileName
                    ? "fact_check"
                    : "add"
              }
              size={15}
              weight={400}
            />
            <span className="font-bold text-sm">
              {isProcessing
                ? "Sedang Memproses..."
                : selectedFileName
                  ? "Kenal Pasti Untuk Proses"
                  : "Pilih Fail Dari Komputer"}
            </span>
          </button>

          {/* Error */}
          {processingError ? (
            <p className="max-w-xl text-xs font-bold text-red">
              {processingError}
            </p>
          ) : null}

          {/* File Selected */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onFileChange}
          />
          {selectedFileName && !isProcessing ? (
            <div className="flex max-w-full flex-wrap items-center justify-center gap-3">
              <p className="min-w-0 max-w-md truncate text-xs  text-content-muted">
                <span className="font-bold">Fail Dipilih: </span>
                <span>{selectedFileName}</span>
              </p>
              <button
                type="button"
                onClick={onClearSelectedFile}
                className="inline-flex items-center justify-center gap-1 rounded border border-red/30 bg-surface px-2 py-1.5 text-[11px] font-bold text-red shadow-sm transition hover:bg-danger-surface"
              >
                <Icon icon="close" size={10} weight={400} />
                Batal
              </button>
            </div>
          ) : null}
        </div>
      </div>   
    </div>
  );
}
