import { Prisma } from "@prisma/client";

export type QueryClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export async function findResidentByNormalizedIc(
  tx: QueryClient,
  icNumber: string,
) {
  const normalizedIc = normalizeIc(icNumber);
  const residentIdByIc = await findResidentsByNormalizedIcs(tx, [normalizedIc]);

  return residentIdByIc.get(normalizedIc) ?? "";
}

export async function findResidentsByNormalizedIcs(
  tx: QueryClient,
  icNumbers: string[],
) {
  const normalizedIcs = [
    ...new Set(icNumbers.map(normalizeIc).filter(Boolean)),
  ];
  const residentIdByIc = new Map<string, string>();

  if (normalizedIcs.length === 0) {
    return residentIdByIc;
  }

  const residents = await tx.$queryRaw<
    { id: string; normalizedIc: string }[]
  >`
    SELECT DISTINCT ON (regexp_replace("icNumber", '\\D', '', 'g'))
      "id",
      regexp_replace("icNumber", '\\D', '', 'g') AS "normalizedIc"
    FROM "Resident"
    WHERE regexp_replace("icNumber", '\\D', '', 'g') IN (${Prisma.join(normalizedIcs)})
    ORDER BY
      regexp_replace("icNumber", '\\D', '', 'g'),
      "createdAt" ASC
  `;

  for (const resident of residents) {
    residentIdByIc.set(resident.normalizedIc, resident.id);
  }

  return residentIdByIc;
}

export async function ensureResidentFromDraft(
  tx: Prisma.TransactionClient,
  draft: {
    fullName: string;
    icNumber: string;
    phone?: string | null;
    position?: string | null;
    department?: string | null;
    description?: string | null;
  },
) {
  const existingResidentId = await findResidentByNormalizedIc(tx, draft.icNumber);

  if (existingResidentId) {
    return existingResidentId;
  }

  const resident = await tx.resident.create({
    data: {
      fullName: draft.fullName,
      icNumber: draft.icNumber,
      phone: draft.phone ?? null,
      position: draft.position ?? null,
      department: draft.department ?? null,
      description: draft.description ?? null,
    },
    select: { id: true },
  });

  return resident.id;
}

function normalizeIc(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}
