import type { Resident, ResidentStatus } from "@prisma/client";

export type AvailableResidentOccupancyRange = {
  id: string;
  unitId: string;
  moveInDate: string;
  moveOutDate: string | null;
  status: "CURRENT" | "PAST";
};

export type AvailableResidentListItem = {
  id: string;
  icNumber: string;
  fullName: string;
  status: ResidentStatus;
  hasCurrentUnit: boolean;
  occupancyRanges: AvailableResidentOccupancyRange[];
};

export function mapAvailableResidentForApi(
  resident: Pick<Resident, "id" | "icNumber" | "fullName" | "status"> & {
    occupancies?: Array<{
      id: string;
      unitId: string;
      moveInDate: Date;
      moveOutDate: Date | null;
      status: "CURRENT" | "PAST";
    }>;
  },
): AvailableResidentListItem {
  const occupancyRanges = (resident.occupancies ?? []).map((occupancy) => ({
    id: occupancy.id,
    unitId: occupancy.unitId,
    moveInDate: occupancy.moveInDate.toISOString(),
    moveOutDate: occupancy.moveOutDate?.toISOString() ?? null,
    status: occupancy.status,
  }));

  return {
    id: resident.id,
    icNumber: resident.icNumber,
    fullName: resident.fullName,
    status: resident.status,
    hasCurrentUnit: occupancyRanges.some((occupancy) => occupancy.status === "CURRENT"),
    occupancyRanges,
  };
}