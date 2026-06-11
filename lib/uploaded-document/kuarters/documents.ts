import type {
  ExtractedQuarterRecord,
  ExtractedQuarterUnit,
  KuartersExtractResult,
} from "@/app/pages/2_muat_naik/components/extract-review-shared";
import { prisma } from "@/lib/prisma";
import type { ReviewBuildOptions } from "@/lib/uploaded-document/documents";
import {
  findKuartersCategoryMatches,
  findKuartersUnitMatches,
} from "@/lib/uploaded-document/kuarters/queries";

export async function buildKuartersExtractResultFromDraftRows(
  uploadedDocumentId: string,
  options: ReviewBuildOptions = {},
): Promise<KuartersExtractResult | null> {
  const categories = await prisma.quarterCategoryDraft.findMany({
    where: { uploadedDocumentId },
    include: { units: { orderBy: [{ unitCode: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ categoryName: "asc" }, { createdAt: "asc" }],
  });

  if (categories.length === 0) {
    return null;
  }

  const categoryMatches = await findKuartersCategoryMatches(prisma, categories);
  const storedUnitMatches = new Map(
    categories.flatMap((category) =>
      category.units
        .filter(
          (
            unit,
          ): unit is typeof unit & {
            originalUnitId: string;
          } => Boolean(unit.originalUnitId),
        )
        .map((unit) => [
          unit.id,
          { draftId: unit.id, unitId: unit.originalUnitId },
        ]),
    ),
  );
  const unitsToRefresh = categories.flatMap((category) => {
    const categoryId = categoryMatches.get(category.id)?.categoryId;

    if (!categoryId) {
      return [];
    }

    return category.units
      .filter(
        (unit) =>
          !options.useStoredReferences || !storedUnitMatches.has(unit.id),
      )
      .map((unit) => ({ unit, categoryId }));
  });
  const refreshedUnitMatches = await findKuartersUnitMatches(
    prisma,
    unitsToRefresh,
  );
  const unitMatches = new Map([
    ...storedUnitMatches,
    ...refreshedUnitMatches,
  ]);
  const records: ExtractedQuarterRecord[] = categories.map((category) => {
    const address = category.address ?? "N/A";
    const categoryMatch = categoryMatches.get(category.id);
    const units: ExtractedQuarterUnit[] = category.units.map((unit) => {
      const originalUnitId = unitMatches.get(unit.id)?.unitId;

      return {
        unitId: unit.id,
        originalUnitId,
        unitCode: unit.unitCode,
        address,
        isExisted: Boolean(originalUnitId),
      };
    });

    return {
      id: category.id,
      categoryId: category.id,
      categoryIsExisted: categoryMatch?.isExact ?? false,
      originalCategoryId: categoryMatch?.categoryId,
      categoryName: category.categoryName,
      address,
      rentalPrice: category.rentalPrice.toFixed(2),
      maintenancePrice: category.maintenancePrice.toFixed(2),
      penaltyPrice: category.penaltyPrice.toFixed(2),
      unitCount: category.units.length,
      units,
    };
  });

  return {
    documentType: "kuarters",
    recordCount: records.length,
    totalUnits: records.reduce((total, record) => total + record.units.length, 0),
    records,
  };
}
