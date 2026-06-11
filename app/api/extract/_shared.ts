import { NextResponse } from "next/server";

import type { ExtractResult } from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { getCurrentAdmin } from "@/lib/auth/current-admin";
import { createUploadedDocumentForKind } from "@/lib/uploaded-document/import";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

const supportedTypesByKind = {
  bayaran: [".pdf", ".xlsx"],
  tunggakan: [".pdf", ".xlsx"],
  penghuni: [".pdf", ".xlsx"],
  kuarters: [".pdf", ".xlsx"],
} as const;

export type ExtractKind = keyof typeof supportedTypesByKind;

export async function handleExtractRequest(request: Request, kind: ExtractKind) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Fail dokumen diperlukan." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Fail kosong." },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { success: false, message: "Saiz fail maksimum adalah 25MB." },
        { status: 400 },
      );
    }

    const extension = file.name.includes(".")
      ? `.${file.name.split(".").pop()?.toLowerCase()}`
      : "";
    const supportedTypes = supportedTypesByKind[kind];

    if (!supportedTypes.includes(extension as never)) {
      return NextResponse.json(
        {
          success: false,
          message: `Sila muat naik fail ${supportedTypes.join(" atau ")} sahaja.`,
        },
        { status: 400 },
      );
    }

    const outboundFormData = new FormData();
    outboundFormData.append("file", file, file.name);

    const aiServiceBaseUrl =
      process.env.AI_SERVICE_URL ??
      process.env.NEXT_PUBLIC_AI_SERVICE_URL ??
      "http://127.0.0.1:8000";
    const extractionUrl = new URL(`${aiServiceBaseUrl}/extract/${kind}`);

    if (
      kind === "bayaran" ||
      kind === "kuarters" ||
      kind === "penghuni" ||
      kind === "tunggakan"
    ) {
      const parsingMode = formData.get("parsingMode");
      extractionUrl.searchParams.set(
        "parsing_mode",
        parsingMode === "assisted" ? "assisted" : "strict",
      );
    }

    const response = await fetch(extractionUrl.toString(), {
      method: "POST",
      body: outboundFormData,
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: result?.detail ?? "Gagal mengekstrak data dokumen.",
        },
        { status: response.status },
      );
    }

    const extractResult = result as ExtractResult;
    const shouldCreateDraft = formData.get("createDraft") === "true";

    if (shouldCreateDraft) {
      const lastUpdatedMonth = formData.get("tunggakanDate");
      const extractResultToSave: ExtractResult =
        kind === "tunggakan" && extractResult.documentType === "tunggakan"
          ? {
              ...extractResult,
              lastUpdatedMonth:
                typeof lastUpdatedMonth === "string" ? lastUpdatedMonth : "",
            }
          : extractResult;
      const currentAdmin = await getCurrentAdmin();
      const document = await createUploadedDocumentForKind({
        kind,
        currentAdmin,
        payload: {
          fileName: file.name,
          fileType:
            file.type || extension.replace(/^\./, "") || "file",
          fileSize: file.size,
          extractResult: extractResultToSave,
        },
      });
      const documentSummary = {
        id: document.id,
        kind: document.kind,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.uploadedAt,
      };

      return NextResponse.json({
        success: true,
        data: { document: documentSummary },
      });
    }

    return NextResponse.json({
      success: true,
      data: { extractResult },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal memproses dokumen.",
      },
      { status: 500 },
    );
  }
}
