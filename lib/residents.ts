import type { Resident } from "@prisma/client";

export type AvailableResidentListItem = {
  id: string;
  icNumber: string;
  fullName: string;
};

export function mapAvailableResidentForApi(
  resident: Pick<Resident, "id" | "icNumber" | "fullName">,
): AvailableResidentListItem {
  return {
    id: resident.id,
    icNumber: resident.icNumber,
    fullName: resident.fullName,
  };
}
