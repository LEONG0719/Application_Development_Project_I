import type { Prisma } from "@prisma/client";

import type { QueryClient } from "@/lib/uploaded-document/shared";

export type KuartersCategoryMatch = {
  draftId: string;
  categoryId: string;
  isExact: boolean;
};

export type KuartersUnitMatch = {
  draftId: string;
  unitId: string;
};

export async function findQuarterCategoryByNameAddress(
  tx: QueryClient,
  categoryName: string,
  address: string | null,
) {
  const categories = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
      UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return categories[0]?.id ?? "";
}

export async function findQuarterCategoryByDetails(
  tx: QueryClient,
  categoryName: string,
  address: string | null,
  rentalPrice: string,
  maintenancePrice: string,
  penaltyPrice: string,
) {
  const categories = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
      UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
      AND "rentalPrice" = ${rentalPrice}::numeric
      AND "maintenancePrice" = ${maintenancePrice}::numeric
      AND "penaltyPrice" = ${penaltyPrice}::numeric
    LIMIT 1
  `;

  return categories[0]?.id ?? "";
}

export async function findUnitByCategoryIdAndCode(
  tx: QueryClient,
  categoryId: string,
  unitCode: string,
) {
  const units = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Unit"
    WHERE "categoryId" = ${categoryId}::uuid
      AND UPPER(TRIM(regexp_replace("unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return units[0]?.id ?? "";
}

export async function findKuartersCategoryMatches(
  tx: QueryClient,
  drafts: {
    id: string;
    categoryName: string;
    address: string | null;
    rentalPrice: Prisma.Decimal | string;
    maintenancePrice: Prisma.Decimal | string;
    penaltyPrice: Prisma.Decimal | string;
  }[],
) {
  if (drafts.length === 0) {
    return new Map<string, KuartersCategoryMatch>();
  }

  const payload = drafts.map((draft) => ({
    draftId: draft.id,
    categoryName: draft.categoryName,
    address: draft.address ?? "",
    rentalPrice: draft.rentalPrice.toString(),
    maintenancePrice: draft.maintenancePrice.toString(),
    penaltyPrice: draft.penaltyPrice.toString(),
  }));
  const matches = await tx.$queryRaw<KuartersCategoryMatch[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        "draftId" text,
        "categoryName" text,
        "address" text,
        "rentalPrice" numeric,
        "maintenancePrice" numeric,
        "penaltyPrice" numeric
      )
    )
    SELECT DISTINCT ON (input."draftId")
      input."draftId",
      category."id" AS "categoryId",
      (
        category."rentalPrice" = input."rentalPrice"
        AND category."maintenancePrice" = input."maintenancePrice"
        AND category."penaltyPrice" = input."penaltyPrice"
      ) AS "isExact"
    FROM input
    INNER JOIN "QuarterCategory" category
      ON UPPER(TRIM(regexp_replace(category."categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."categoryName", '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE(category."address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(input."address", ''), '\\s+', ' ', 'g')))
    ORDER BY input."draftId", "isExact" DESC, category."createdAt" ASC
  `;

  return new Map(matches.map((match) => [match.draftId, match]));
}

export async function findKuartersUnitMatches(
  tx: QueryClient,
  rows: {
    unit: { id: string; unitCode: string };
    categoryId: string;
  }[],
) {
  if (rows.length === 0) {
    return new Map<string, KuartersUnitMatch>();
  }

  const payload = rows.map(({ unit, categoryId }) => ({
    draftId: unit.id,
    categoryId,
    unitCode: unit.unitCode,
  }));
  const matches = await tx.$queryRaw<KuartersUnitMatch[]>`
    WITH input AS (
      SELECT *
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        "draftId" text,
        "categoryId" uuid,
        "unitCode" text
      )
    )
    SELECT DISTINCT ON (input."draftId")
      input."draftId",
      unit."id" AS "unitId"
    FROM input
    INNER JOIN "Unit" unit
      ON unit."categoryId" = input."categoryId"
      AND UPPER(TRIM(regexp_replace(unit."unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(input."unitCode", '\\s+', ' ', 'g')))
    ORDER BY input."draftId", unit."createdAt" ASC
  `;

  return new Map(matches.map((match) => [match.draftId, match]));
}
