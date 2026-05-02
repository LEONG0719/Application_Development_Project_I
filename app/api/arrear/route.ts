import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapTunggakanForApi } from "../../../lib/arrears";

export async function GET() {
  try {
    // 1. Fetch all residents with their active units and complete charge history
    const residents = await prisma.resident.findMany({
      // We only want verified residents. You can adjust this 'where' clause 
      // if you need to filter out people who have completely moved out (KELUAR).
      where: {
        recordStatus: "VERIFIED",
      },
      include: {
        occupancies: {
          where: { status: "CURRENT" },
          include: {
            unit: {
              include: { quarterClass: true },
            },
          },
        },
        monthlyCharges: {
          where: { recordStatus: "VERIFIED" },
          include: {
            additionalCharges: { where: { recordStatus: "VERIFIED" } },
            rebates: { where: { recordStatus: "VERIFIED" } },
          },
        },
      },
    });

    // 2. Map the raw database data into the clean frontend list format
    const tunggakanList = residents.map(mapTunggakanForApi);

    // 3. Calculate Live KPIs
    // A. Jumlah Tunggakan (Live sum of current outstanding debts)
    const jumlahTunggakan = tunggakanList.reduce((sum, item) => sum + item.jumlahTunggakan, 0);

    // B. Jumlah Rekod (Total historical revenue charged across the whole system)
    const historicalDebits = await prisma.transaction.aggregate({
      _sum: {
        debitAmount: true,
      },
      where: {
        status: "NORMAL",
      }
    });
    
    const jumlahRekod = Number(historicalDebits._sum.debitAmount || 0);

    // 4. Return the successful response
    return NextResponse.json({
      ok: true,
      summary: {
        jumlahRekod,
        jumlahTunggakan,
      },
      data: tunggakanList,
    });

  } catch (error) {
    console.error("[API_TUNGGAKAN_GET] Error fetching arrears data:", error);
    
    // Return error message in Malay for the UI to display
    return NextResponse.json(
      { 
        ok: false, 
        message: "Ralat sistem sistem berlaku semasa mengambil senarai tunggakan. Sila cuba sebentar lagi." 
      },
      { status: 500 }
    );
  }
}