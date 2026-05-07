import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const allowedKinds = ["bayaran", "tunggakan", "penghuni", "kuarters"] as const;
const supportedTypesByKind: Record<(typeof allowedKinds)[number], string[]> = {
  bayaran: [".pdf"],
  tunggakan: [".xlsx"],
  penghuni: [".xlsx"],
  kuarters: [".pdf", ".xlsx"],
};

type RouteContext = {
  params: Promise<{
    kind: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { kind } = await context.params;
    const normalizedKind = kind.toLowerCase() as (typeof allowedKinds)[number];

    if (!allowedKinds.includes(normalizedKind)) {
      return NextResponse.json(
        { success: false, message: "Jenis dokumen tidak sah." },
        { status: 400 },
      );
    }

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
    const supportedTypes = supportedTypesByKind[normalizedKind];

    if (!supportedTypes.includes(extension)) {
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
    const extractionUrl = new URL(`${aiServiceBaseUrl}/extract/${normalizedKind}`);

    if (normalizedKind === "kuarters") {
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

    return NextResponse.json({
      success: true,
      data: {
        extractResult: result,
      },
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
