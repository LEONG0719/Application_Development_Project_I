import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  mapQuarterClassUnitsDetailForApi,
  quarterClassUnitsDetailInclude,
  type QuarterClassUnitsDetail,
} from "@/lib/quarter-units";

import type { KuartersNotice } from "../components/kuartersHelpers";
import KuartersClassDetailPageClient from "./components/KuartersClassDetailPageClient";

export const dynamic = "force-dynamic";

type KuartersClassDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getInitialKuartersClassDetailData(id: string): Promise<{
  initialData: QuarterClassUnitsDetail;
  initialNotice: KuartersNotice | null;
  isNotFound: boolean;
}> {
  try {
    const quarterClass = await prisma.quarterClass.findUnique({
      where: {
        id,
      },
      include: quarterClassUnitsDetailInclude,
    });

    if (!quarterClass) {
      return {
        initialData: {
          id,
          className: "",
          rates: {
            rentalPrice: null,
            maintenancePrice: null,
            penaltyPrice: null,
          },
          summary: null,
          units: [],
        },
        initialNotice: null,
        isNotFound: true,
      };
    }

    return {
      initialData: mapQuarterClassUnitsDetailForApi(quarterClass),
      initialNotice: null,
      isNotFound: false,
    };
  } catch (error) {
    console.error("Gagal memuatkan butiran kelas kuarters:", error);

    return {
      initialData: {
        id,
        className: "Maklumat Kelas Kuarters",
        rates: {
          rentalPrice: null,
          maintenancePrice: null,
          penaltyPrice: null,
        },
        summary: null,
        units: [],
      },
      initialNotice: {
        tone: "error",
        message: "Gagal mendapatkan data butiran kelas kuarters.",
      },
      isNotFound: false,
    };
  }
}

export default async function KuartersClassDetailPage({
  params,
}: KuartersClassDetailPageProps) {
  const { id } = await params;
  const { initialData, initialNotice, isNotFound } =
    await getInitialKuartersClassDetailData(id);

  if (isNotFound) {
    notFound();
  }

  return (
    <KuartersClassDetailPageClient
      initialData={initialData}
      initialNotice={initialNotice}
    />
  );
}
