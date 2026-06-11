import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import type { VerifyResult } from "@/lib/uploaded-document/verification";
import {
  findKuartersCategoryMatches,
  findKuartersUnitMatches,
} from "@/lib/uploaded-document/kuarters/queries";

type KuartersCategoryDraft = Prisma.QuarterCategoryDraftGetPayload<{
  include: { units: true };
}>;

export async function verifyKuartersDrafts(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  selectedKeys: string[],
): Promise<VerifyResult> {
  const selectedKeySet = new Set(selectedKeys);
  const selectedUnitIds = selectedKeys.filter(isUuid);
  const categoryDrafts = await tx.quarterCategoryDraft.findMany({
    where: {
      uploadedDocumentId,
      OR: [
        { id: { in: selectedKeys } },
        { units: { some: { id: { in: selectedKeys } } } },
      ],
    },
    include: {
      units: {
        where: { id: { in: selectedUnitIds } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  const failedMessages: string[] = [];

  if (categoryDrafts.length === 0) {
    return { verifiedRows: 0, failedMessages };
  }

  const categoryMatches = await findKuartersCategoryMatches(tx, categoryDrafts);
  const categoryIdByDraftId = new Map<string, string>();
  const exactCategoryDrafts = [];
  const categoryDraftUpdates = [];
  const newCategoryRows = [];
  const selectedCategoryDrafts = categoryDrafts.filter((draft) =>
    selectedKeySet.has(draft.id),
  );
  const categoryIdByIdentity = new Map<string, string>();
  let verifiedRows = 0;

  for (const draft of selectedCategoryDrafts) {
    const identityKey = kuartersCategoryIdentityKey(draft);
    const existingCreatedCategoryId = categoryIdByIdentity.get(identityKey);
    const match = categoryMatches.get(draft.id);

    if (existingCreatedCategoryId) {
      categoryIdByDraftId.set(draft.id, existingCreatedCategoryId);
      categoryDraftUpdates.push({
        draftId: draft.id,
        categoryId: existingCreatedCategoryId,
      });
      continue;
    }

    if (match?.isExact) {
      failedMessages.push(`Kategori ${draft.categoryName} telah wujud.`);
      categoryIdByDraftId.set(draft.id, match.categoryId);
      exactCategoryDrafts.push({
        draftId: draft.id,
        categoryId: match.categoryId,
      });
      categoryIdByIdentity.set(identityKey, match.categoryId);
      continue;
    }

    if (match?.categoryId) {
      categoryIdByDraftId.set(draft.id, match.categoryId);
      categoryDraftUpdates.push({
        draftId: draft.id,
        categoryId: match.categoryId,
      });
      verifiedRows += 1;
      categoryIdByIdentity.set(identityKey, match.categoryId);
      continue;
    }

    const categoryId = randomUUID();

    categoryIdByDraftId.set(draft.id, categoryId);
    categoryDraftUpdates.push({ draftId: draft.id, categoryId });
    newCategoryRows.push({
      id: categoryId,
      categoryName: draft.categoryName,
      address: draft.address,
      rentalPrice: draft.rentalPrice,
      maintenancePrice: draft.maintenancePrice,
      penaltyPrice: draft.penaltyPrice,
    });
    verifiedRows += 1;
    categoryIdByIdentity.set(identityKey, categoryId);
  }

  for (const draft of categoryDrafts) {
    if (categoryIdByDraftId.has(draft.id)) {
      continue;
    }

    const match = categoryMatches.get(draft.id);

    if (match?.categoryId) {
      categoryIdByDraftId.set(draft.id, match.categoryId);
    }
  }

  await createKuartersCategories(tx, newCategoryRows);
  await updateExistingKuartersCategories(
    tx,
    selectedCategoryDrafts.filter((draft) => {
      const match = categoryMatches.get(draft.id);

      return Boolean(match?.categoryId && !match.isExact);
    }),
    categoryIdByDraftId,
  );
  await updateKuartersCategoryDraftReferences(tx, [
    ...exactCategoryDrafts,
    ...categoryDraftUpdates,
  ]);

  const selectedUnitDrafts = categoryDrafts.flatMap((draft) => {
    const categoryId = categoryIdByDraftId.get(draft.id);

    if (!categoryId) {
      return [];
    }

    return draft.units
      .filter((unit) => selectedKeySet.has(unit.id))
      .map((unit) => ({ unit, categoryId }));
  });
  const unitMatches = await findKuartersUnitMatches(tx, selectedUnitDrafts);
  const unitDraftUpdates = [];
  const newUnitRows = [];
  const unitIdByIdentity = new Map<string, string>();

  for (const row of selectedUnitDrafts) {
    const match = unitMatches.get(row.unit.id);
    const identityKey = [
      row.categoryId,
      normalizeKuartersText(row.unit.unitCode).toUpperCase(),
    ].join("|");

    if (match?.unitId) {
      unitIdByIdentity.set(identityKey, match.unitId);
    }

    const existingUnitId = match?.unitId ?? unitIdByIdentity.get(identityKey);

    if (existingUnitId) {
      failedMessages.push(`Unit ${row.unit.unitCode} telah wujud.`);
      unitDraftUpdates.push({
        draftId: row.unit.id,
        unitId: existingUnitId,
      });
      continue;
    }

    const unitId = randomUUID();

    unitIdByIdentity.set(identityKey, unitId);
    newUnitRows.push({
      id: unitId,
      unitCode: row.unit.unitCode,
      status: row.unit.status,
      categoryId: row.categoryId,
      draftId: row.unit.id,
    });
    verifiedRows += 1;
  }

  await updateKuartersUnitDraftReferences(tx, unitDraftUpdates);
  await createKuartersUnits(tx, newUnitRows);

  if (newUnitRows.length > 0) {
    await tx.unitDraft.deleteMany({
      where: { id: { in: newUnitRows.map((row) => row.draftId) } },
    });
  }

  await tx.quarterCategoryDraft.deleteMany({
    where: {
      uploadedDocumentId,
      units: { none: {} },
    },
  });

  return { verifiedRows, failedMessages };
}

async function createKuartersCategories(
  tx: Prisma.TransactionClient,
  rows: {
    id: string;
    categoryName: string;
    address: string | null;
    rentalPrice: Prisma.Decimal;
    maintenancePrice: Prisma.Decimal;
    penaltyPrice: Prisma.Decimal;
  }[],
) {
  if (rows.length === 0) {
    return;
  }

  await tx.quarterCategory.createMany({ data: rows, skipDuplicates: true });
}

async function updateExistingKuartersCategories(
  tx: Prisma.TransactionClient,
  drafts: KuartersCategoryDraft[],
  categoryIdByDraftId: Map<string, string>,
) {
  const rows = drafts
    .map((draft) => ({ draft, categoryId: categoryIdByDraftId.get(draft.id) }))
    .filter((row): row is { draft: KuartersCategoryDraft; categoryId: string } =>
      Boolean(row.categoryId),
    );

  if (rows.length === 0) {
    return;
  }

  await tx.$executeRaw`
    UPDATE "QuarterCategory" AS category
    SET
      "categoryName" = updates."categoryName",
      "address" = updates."address",
      "rentalPrice" = updates."rentalPrice",
      "maintenancePrice" = updates."maintenancePrice",
      "penaltyPrice" = updates."penaltyPrice",
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        rows.map(
          ({ draft, categoryId }) =>
            Prisma.sql`(
              ${categoryId}::uuid,
              ${draft.categoryName}::text,
              ${draft.address ?? null}::text,
              ${draft.rentalPrice}::numeric,
              ${draft.maintenancePrice}::numeric,
              ${draft.penaltyPrice}::numeric
            )`,
        ),
      )}
    ) AS updates(
      "id",
      "categoryName",
      "address",
      "rentalPrice",
      "maintenancePrice",
      "penaltyPrice"
    )
    WHERE category."id" = updates."id"
  `;
}

async function updateKuartersCategoryDraftReferences(
  tx: Prisma.TransactionClient,
  updates: { draftId: string; categoryId: string }[],
) {
  if (updates.length === 0) {
    return;
  }

  await tx.$executeRaw`
    UPDATE "QuarterCategoryDraft" AS draft
    SET
      "originalCategoryId" = updates."categoryId",
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        updates.map(
          (update) =>
            Prisma.sql`(${update.draftId}::uuid, ${update.categoryId}::uuid)`,
        ),
      )}
    ) AS updates("id", "categoryId")
    WHERE draft."id" = updates."id"
  `;
}

async function updateKuartersUnitDraftReferences(
  tx: Prisma.TransactionClient,
  updates: { draftId: string; unitId: string | null }[],
) {
  const rows = updates.filter(
    (update): update is { draftId: string; unitId: string } =>
      Boolean(update.unitId),
  );

  if (rows.length === 0) {
    return;
  }

  await tx.$executeRaw`
    UPDATE "UnitDraft" AS draft
    SET
      "originalUnitId" = updates."unitId",
      "updatedAt" = NOW()
    FROM (
      VALUES ${Prisma.join(
        rows.map(
          (update) =>
            Prisma.sql`(${update.draftId}::uuid, ${update.unitId}::uuid)`,
        ),
      )}
    ) AS updates("id", "unitId")
    WHERE draft."id" = updates."id"
  `;
}

async function createKuartersUnits(
  tx: Prisma.TransactionClient,
  rows: {
    id: string;
    unitCode: string;
    status: "OCCUPIED" | "VACANT";
    categoryId: string;
    draftId: string;
  }[],
) {
  if (rows.length === 0) {
    return;
  }

  await tx.unit.createMany({
    data: rows.map((row) => ({
      id: row.id,
      unitCode: row.unitCode,
      status: row.status,
      categoryId: row.categoryId,
    })),
    skipDuplicates: true,
  });
}

function kuartersCategoryIdentityKey(draft: KuartersCategoryDraft) {
  return [
    normalizeKuartersText(draft.categoryName).toUpperCase(),
    normalizeKuartersText(draft.address).toUpperCase(),
  ].join("|");
}

function normalizeKuartersText(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
