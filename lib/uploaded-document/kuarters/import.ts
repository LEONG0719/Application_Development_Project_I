import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type {
  ExtractedQuarterRecord,
  ExtractedQuarterUnit,
  ExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { createOrderedTimestamps } from "@/lib/uploaded-document/import-utils";
import {
  findKuartersCategoryMatches,
  findKuartersUnitMatches,
} from "@/lib/uploaded-document/kuarters/queries";

export async function createPendingKuartersRows(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  extractResult: ExtractResult,
) {
  if (extractResult.documentType !== "kuarters") {
    return extractResult;
  }

  const categoryTimestamps = createOrderedTimestamps(extractResult.records.length);
  const preparedCategories = extractResult.records.map((record, index) => ({
    record,
    categoryAddress: record.address?.trim() || "N/A",
    categoryDraftId: randomUUID(),
    createdAt: categoryTimestamps[index],
  }));
  const categoryMatches = await findKuartersCategoryMatches(
    tx,
    preparedCategories.map(
      ({ record, categoryAddress, categoryDraftId }) => ({
        id: categoryDraftId,
        categoryName: record.categoryName,
        address: categoryAddress,
        rentalPrice: record.rentalPrice || "0",
        maintenancePrice: record.maintenancePrice || "0",
        penaltyPrice: record.penaltyPrice || "0",
      }),
    ),
  );
  const totalUnits = preparedCategories.reduce(
    (total, category) => total + category.record.units.length,
    0,
  );
  const unitTimestamps = createOrderedTimestamps(totalUnits);
  let unitIndex = 0;
  const preparedUnits = preparedCategories.flatMap((category) =>
    category.record.units.map((unit) => ({
      unit,
      unitDraftId: randomUUID(),
      categoryDraftId: category.categoryDraftId,
      originalCategoryId:
        categoryMatches.get(category.categoryDraftId)?.categoryId ?? null,
      createdAt: unitTimestamps[unitIndex++],
    })),
  );
  const unitMatches = await findKuartersUnitMatches(
    tx,
    preparedUnits
      .filter(
        (unit): unit is typeof unit & { originalCategoryId: string } =>
          Boolean(unit.originalCategoryId),
      )
      .map((unit) => ({
        unit: {
          id: unit.unitDraftId,
          unitCode: unit.unit.unitCode,
        },
        categoryId: unit.originalCategoryId,
      })),
  );

  if (preparedCategories.length > 0) {
    await tx.quarterCategoryDraft.createMany({
      data: preparedCategories.map(
        ({ record, categoryAddress, categoryDraftId, createdAt }) => ({
          id: categoryDraftId,
          categoryName: record.categoryName,
          address: categoryAddress,
          rentalPrice: record.rentalPrice || "0",
          maintenancePrice: record.maintenancePrice || "0",
          penaltyPrice: record.penaltyPrice || "0",
          uploadedDocumentId,
          originalCategoryId:
            categoryMatches.get(categoryDraftId)?.categoryId ?? null,
          createdAt,
          updatedAt: createdAt,
        }),
      ),
    });
  }

  if (preparedUnits.length > 0) {
    await tx.unitDraft.createMany({
      data: preparedUnits.map(
        ({ unit, unitDraftId, categoryDraftId, createdAt }) => ({
          id: unitDraftId,
          unitCode: unit.unitCode,
          uploadedDocumentId,
          categoryDraftId,
          originalUnitId: unitMatches.get(unitDraftId)?.unitId ?? null,
          createdAt,
          updatedAt: createdAt,
        }),
      ),
    });
  }

  const unitsByCategoryId = new Map<string, ExtractedQuarterUnit[]>();
  for (const { unit, unitDraftId, categoryDraftId } of preparedUnits) {
    const units = unitsByCategoryId.get(categoryDraftId) ?? [];
    units.push({
      ...unit,
      unitId: unitDraftId,
      originalUnitId: unitMatches.get(unitDraftId)?.unitId,
      isExisted: unitMatches.has(unitDraftId),
    });
    unitsByCategoryId.set(categoryDraftId, units);
  }

  const records: ExtractedQuarterRecord[] = preparedCategories.map(
    ({ record, categoryDraftId }) => {
      const units = unitsByCategoryId.get(categoryDraftId) ?? [];

      return {
        ...record,
        id: categoryDraftId,
        categoryId: categoryDraftId,
        originalCategoryId:
          categoryMatches.get(categoryDraftId)?.categoryId,
        categoryIsExisted:
          categoryMatches.get(categoryDraftId)?.isExact ?? false,
        unitCount: units.length,
        units,
      };
    },
  );

  return {
    ...extractResult,
    recordCount: records.length,
    totalUnits,
    records,
  };
}
