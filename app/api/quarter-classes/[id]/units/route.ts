import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  buildQuarterUnitCreatedMessage,
  buildQuarterUnitDuplicateMessage,
  buildQuarterUnitOccupancyConflictMessage,
  buildQuarterUnitResidentNotFoundMessage,
  mapQuarterClassUnitsDetailForApi,
  mapQuarterUnitForApi,
  parseQuarterUnitCreateBody,
  quarterClassUnitsDetailInclude,
  quarterUnitCurrentOccupancyInclude,
} from "@/lib/quarter-units";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const quarterClass = await prisma.quarterClass.findUnique({
      where: {
        id,
      },
      include: quarterClassUnitsDetailInclude,
    });

    if (!quarterClass) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const detail = mapQuarterClassUnitsDetailForApi(quarterClass);

    return NextResponse.json({
      success: true,
      message: "Data unit kuarters berjaya diambil.",
      data: {
        quarterClass: detail,
        meta: {
          totalRecords: detail.units.length,
        },
      },
    });
  } catch (error) {
    console.error("Gagal mendapatkan data unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa mendapatkan data unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let requestedUnitCode: string | null = null;

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Format JSON untuk permintaan tambah unit tidak sah.",
        },
        {
          status: 400,
        },
      );
    }

    const parsedBody = parseQuarterUnitCreateBody(body);

    if (!parsedBody.ok) {
      return NextResponse.json(
        {
          success: false,
          message: parsedBody.message,
        },
        {
          status: 400,
        },
      );
    }

    requestedUnitCode = parsedBody.data.unitCode;

    const quarterClass = await prisma.quarterClass.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        className: true,
      },
    });

    if (!quarterClass) {
      return NextResponse.json(
        {
          success: false,
          message: "Kelas kuarters tidak ditemui.",
        },
        {
          status: 404,
        },
      );
    }

    const existingUnit = await prisma.unit.findFirst({
      where: {
        classId: id,
        unitCode: parsedBody.data.unitCode,
      },
      select: {
        id: true,
      },
    });

    if (existingUnit) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterUnitDuplicateMessage(parsedBody.data.unitCode),
        },
        {
          status: 409,
        },
      );
    }

    let resident:
      | {
          id: string;
          fullName: string;
          icNumber: string;
        }
      | null = null;

    if (parsedBody.data.occupantIcNumber) {
      resident = await prisma.resident.findUnique({
        where: {
          icNumber: parsedBody.data.occupantIcNumber,
        },
        select: {
          id: true,
          fullName: true,
          icNumber: true,
        },
      });

      if (!resident) {
        return NextResponse.json(
          {
            success: false,
            message: buildQuarterUnitResidentNotFoundMessage(
              parsedBody.data.occupantIcNumber,
            ),
          },
          {
            status: 404,
          },
        );
      }

      const conflictingOccupancy = await prisma.unitOccupancy.findFirst({
        where: {
          residentId: resident.id,
          status: "CURRENT",
        },
        include: {
          unit: {
            select: {
              unitCode: true,
              quarterClass: {
                select: {
                  className: true,
                },
              },
            },
          },
        },
      });

      if (conflictingOccupancy) {
        return NextResponse.json(
          {
            success: false,
            message: buildQuarterUnitOccupancyConflictMessage(
              resident.fullName,
              resident.icNumber,
              conflictingOccupancy.unit.unitCode,
              conflictingOccupancy.unit.quarterClass.className,
            ),
            data: {
              unitCode: conflictingOccupancy.unit.unitCode,
            },
          },
          {
            status: 409,
          },
        );
      }
    }

    const createdUnit = await prisma.unit.create({
      data: {
        unitCode: parsedBody.data.unitCode,
        status: resident ? "OCCUPIED" : "VACANT",
        classId: id,
        occupancies: resident
          ? {
              create: {
                residentId: resident.id,
                moveInDate: new Date(),
                status: "CURRENT",
              },
            }
          : undefined,
      },
      include: quarterUnitCurrentOccupancyInclude,
    });

    revalidatePath("/pages/7_kuarters");
    revalidatePath(`/pages/7_kuarters/${id}`);

    return NextResponse.json(
      {
        success: true,
        message: buildQuarterUnitCreatedMessage(
          createdUnit.unitCode,
          quarterClass.className,
        ),
        data: {
          unit: mapQuarterUnitForApi(createdUnit),
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: buildQuarterUnitDuplicateMessage(
            requestedUnitCode ?? "tersebut",
          ),
        },
        {
          status: 409,
        },
      );
    }

    console.error("Gagal menambah unit kuarters:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Ralat pelayan berlaku semasa menambah unit kuarters.",
      },
      {
        status: 500,
      },
    );
  }
}
