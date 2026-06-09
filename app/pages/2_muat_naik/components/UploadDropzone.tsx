import type { ChangeEvent, RefObject } from "react";

import Icon from "../../../components/Icon/Icon";

type UploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  selectedFileName: string;
  isProcessing: boolean;
  processingStep: string;
  processingStage: string;
  processingProgress: number;
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
    <div className="relative flex min-h-82.5 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#C6CDDD] bg-white px-6 text-center">
      {/* Processing */}
      {isProcessing ? (
        <div
          className="absolute inset-0 z-10 flex flex-col gap-4 items-center justify-center bg-white px-6"
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
          <h2 className="text-[22px] font-bold leading-tight text-[#07162F]">
            Sedang Memproses Dokumen
          </h2>

          {/* Instruction */}
          <p className="text-sm font-medium leading-6 text-[#667085]">
            {processingStep || "Mengekstrak data daripada dokumen..."}
          </p>
        </div>
        
          <div className="w-full max-w-md">
            {/* Processing Stage and Percentage */}
            <div className="flex items-center justify-between gap-4 text-xs font-bold text-[#344054]">
              <span className="min-w-0 truncate">{processingStage}</span>
              <span>{Math.min(processingProgress, 99)}%</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EEF9]">
              <div
                className="h-full rounded-full bg-green transition-all duration-500"
                style={{ width: `${Math.min(processingProgress, 99)}%` }}
              />
            </div>
          </div>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancelProcessing}
            className="inline-flex h-9 items-center justify-center gap-1 rounded border border-[#F0C7C7] bg-white px-5 text-xs font-bold text-red shadow-sm transition hover:bg-[#FFF7F7]"
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
          <h2 className="text-[22px] font-bold leading-tight text-[#07162F]">
            Muat Naik Fail Di Sini
          </h2>

          {/* Instruction */}
          <p className="text-sm font-medium leading-6 text-[#667085]">
            <div>Pastikan fail dalam format PDF atau Excel (.xlsx) sahaja.</div>
            <div>Saiz fail maksimum adalah 25MB.</div>
          </p>
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
              <p className="min-w-0 max-w-md truncate text-xs  text-[#43506B]">
                <span className="font-bold">Fail Dipilih: </span>
                <span>{selectedFileName}</span>
              </p>
              <button
                type="button"
                onClick={onClearSelectedFile}
                className="inline-flex items-center justify-center gap-1 rounded border border-[#F0C7C7] bg-white px-2 py-1.5 text-[11px] font-bold text-red shadow-sm transition hover:bg-[#FFF7F7]"
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
