import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  getBayaranPaymentDate,
  mapUploadedDocumentForReview,
  mapUploadedDocumentForQueue,
} from "@/lib/uploaded-documents";
import { createAuditLog } from "@/lib/audit-logs";
import { getCurrentAdmin } from "@/lib/current-admin";
import { prisma } from "@/lib/prisma";
import type { ExtractedQuarterRecord } from "@/app/pages/2_muat_naik/components/extract-review-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadedDocumentTransactionOptions = {
  maxWait: 30000,
  timeout: 300000,
};

function normalizeKuartersText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeKuartersMoney(value: unknown) {
  const normalizedValue =
    typeof value === "string" ? value.trim() : String(value ?? "");
  const amount = Number(normalizedValue.replace(/,/g, ""));

  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
}

function normalizeKuartersRecord(record: ExtractedQuarterRecord) {
  return {
    ...record,
    categoryName: normalizeKuartersText(record.categoryName),
    address: normalizeKuartersText(record.address, "N/A"),
    rentalPrice: normalizeKuartersMoney(record.rentalPrice),
    maintenancePrice: normalizeKuartersMoney(record.maintenancePrice),
    penaltyPrice: normalizeKuartersMoney(record.penaltyPrice),
    units: record.units.map((unit) => ({
      ...unit,
      unitCode: normalizeKuartersText(unit.unitCode),
    })),
  };
}

// Finds a category by ID, only if it's pending. This is used to validate that the category being edited is still pending and has not been verified or rejected, which would require different handling.
async function getQuarterCategoryForDraft(
  tx: Prisma.TransactionClient,
  categoryId: string,
) {
  const categories = await tx.$queryRaw<
    {
      id: string;
      recordStatus: "PENDING" | "VERIFIED" | "REJECTED";
      uploadedDocumentId: string | null;
    }[]
  >`
    SELECT "id", "recordStatus", "uploadedDocumentId"
    FROM "QuarterCategory"
    WHERE "id" = ${categoryId}::uuid
    LIMIT 1
  `;

  return categories[0] ?? null;
}

// Finds a verified category that has the same name and address as the given category, excluding the category itself. This is used to detect if there are existing verified categories that match the pending category, which allows us to link the pending category to the verified one and avoid duplicates.
async function findVerifiedQuarterCategoryMatch(
  tx: Prisma.TransactionClient,
  categoryId: string,
  categoryName: string,
  address: string,
) {
  const categories = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE "id" <> ${categoryId}::uuid
      AND "recordStatus" = 'VERIFIED'::"RecordStatus"
      AND UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return categories[0]?.id ?? "";
}

// Finds a pending category that has the same name and address as the given category, excluding the category itself. This is used to detect if there are duplicate categories within the same document.
async function findPendingQuarterCategoryConflict(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  categoryId: string,
  categoryName: string,
  address: string,
) {
  const categories = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "QuarterCategory"
    WHERE "id" <> ${categoryId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "recordStatus" = 'PENDING'::"RecordStatus"
      AND UPPER(TRIM(regexp_replace("categoryName", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${categoryName}, '\\s+', ' ', 'g')))
      AND UPPER(TRIM(regexp_replace(COALESCE("address", ''), '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(COALESCE(${address}::text, ''), '\\s+', ' ', 'g')))
    LIMIT 1
  `;

  return categories[0]?.id ?? "";
}

// When a pending category is verified, we need to link all its pending units to the verified category, and delete any pending units that have duplicate unit codes with the verified category's unitsa
async function linkPendingCategoryToVerifiedCategory(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  pendingCategoryId: string,
  verifiedCategoryId: string,
) {
  await tx.$executeRaw`
    DELETE FROM "Unit" pending_unit
    WHERE pending_unit."categoryId" = ${pendingCategoryId}::uuid
      AND pending_unit."uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND pending_unit."recordStatus" = 'PENDING'::"RecordStatus"
      AND EXISTS (
        SELECT 1
        FROM "Unit" existing_unit
        WHERE existing_unit."categoryId" = ${verifiedCategoryId}::uuid
          AND UPPER(TRIM(regexp_replace(existing_unit."unitCode", '\\s+', ' ', 'g'))) =
            UPPER(TRIM(regexp_replace(pending_unit."unitCode", '\\s+', ' ', 'g')))
          AND (
            existing_unit."recordStatus" = 'VERIFIED'::"RecordStatus"
            OR (
              existing_unit."uploadedDocumentId" = ${uploadedDocumentId}::uuid
              AND existing_unit."recordStatus" = 'PENDING'::"RecordStatus"
            )
          )
      )
  `;

  await tx.$executeRaw`
    UPDATE "Unit"
    SET "categoryId" = ${verifiedCategoryId}::uuid, "updatedAt" = NOW()
    WHERE "categoryId" = ${pendingCategoryId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "recordStatus" = 'PENDING'::"RecordStatus"
  `;

  await tx.$executeRaw`
    DELETE FROM "QuarterCategory"
    WHERE "id" = ${pendingCategoryId}::uuid
      AND "uploadedDocumentId" = ${uploadedDocumentId}::uuid
      AND "recordStatus" = 'PENDING'::"RecordStatus"
  `;
}

// Finds a duplicate unit for a given category, optionally including verified units
async function findDuplicateUnitForCategory(
  tx: Prisma.TransactionClient,
  uploadedDocumentId: string,
  categoryId: string,
  unitId: string,
  unitCode: string,
  includeVerifiedUnits: boolean,
) {
  const units = await tx.$queryRaw<
    { id: string; recordStatus: "PENDING" | "VERIFIED" | "REJECTED" }[]
  >`
    SELECT "id", "recordStatus"
    FROM "Unit"
    WHERE "id" <> ${unitId}::uuid
      AND "categoryId" = ${categoryId}::uuid
      AND UPPER(TRIM(regexp_replace("unitCode", '\\s+', ' ', 'g'))) =
        UPPER(TRIM(regexp_replace(${unitCode}, '\\s+', ' ', 'g')))
      AND (
        (
          "uploadedDocumentId" = ${uploadedDocumentId}::uuid
          AND "recordStatus" = 'PENDING'::"RecordStatus"
        )
        OR (
          ${includeVerifiedUnits}
          AND "recordStatus" = 'VERIFIED'::"RecordStatus"
        )
      )
    ORDER BY
      CASE WHEN "recordStatus" = 'VERIFIED'::"RecordStatus" THEN 0 ELSE 1 END
    LIMIT 1
  `;

  return units[0] ?? null;
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const document = await prisma.uploadedDocument.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, message: "Dokumen tidak ditemui." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        document: await mapUploadedDocumentForReview(document),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mendapatkan dokumen.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { action, extractResult } = body ?? {};

    if (action === "update-kuarters-category") {
      const categoryId = normalizeKuartersText(body?.categoryId);
      const categoryName = normalizeKuartersText(body?.categoryName);
      const address = normalizeKuartersText(body?.address, "N/A");
      const rentalPrice = normalizeKuartersMoney(body?.rentalPrice);
      const maintenancePrice = normalizeKuartersMoney(body?.maintenancePrice);
      const penaltyPrice = normalizeKuartersMoney(body?.penaltyPrice);

      if (!categoryId || !categoryName) {
        return NextResponse.json(
          { success: false, message: "Data kategori kuarters tidak lengkap." },
          { status: 400 },
        );
      }

      const document = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const currentCategory = await getQuarterCategoryForDraft(tx, categoryId);

          if (
            !currentCategory ||
            currentCategory.recordStatus !== "PENDING" ||
            currentCategory.uploadedDocumentId !== id
          ) {
            throw new Error("Kategori kuarters tidak boleh dikemas kini.");
          }

          const verifiedCategoryId = await findVerifiedQuarterCategoryMatch(
            tx,
            categoryId,
            categoryName,
            address,
          );

          if (verifiedCategoryId) {
            await linkPendingCategoryToVerifiedCategory(
              tx,
              id,
              categoryId,
              verifiedCategoryId,
            );
          } else {
            const pendingCategoryConflictId =
              await findPendingQuarterCategoryConflict(
                tx,
                id,
                categoryId,
                categoryName,
                address,
              );

            if (pendingCategoryConflictId) {
              throw new Error(
                `Kategori dan alamat kuarters bertindih dalam dokumen ini: ${categoryName}.`,
              );
            }

            const updatedCategoryCount = await tx.$executeRaw`
              UPDATE "QuarterCategory"
              SET
                "categoryName" = ${categoryName},
                "address" = ${address},
                "rentalPrice" = ${rentalPrice}::numeric,
                "maintenancePrice" = ${maintenancePrice}::numeric,
                "penaltyPrice" = ${penaltyPrice}::numeric,
                "updatedAt" = NOW()
              WHERE "id" = ${categoryId}::uuid
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;

            if (updatedCategoryCount === 0) {
              throw new Error(
                `Kategori kuarters tidak dapat dikemas kini: ${categoryName}.`,
              );
            }
          }

          const updatedDocument = await tx.uploadedDocument.findUnique({
            where: { id },
            include: {
              uploadedBy: {
                select: {
                  fullName: true,
                },
              },
            },
          });

          if (!updatedDocument) {
            throw new Error("Dokumen tidak ditemui.");
          }

          await createAuditLog(tx, {
            actor: currentAdmin,
            moduleName: "Muat Naik",
            targetData: `${updatedDocument.category} / ${updatedDocument.originalName ?? updatedDocument.fileName}`,
            actionType: "UPDATE",
            description: `Mengemaskini kategori kuarters ${categoryName} dalam draf ekstrak dokumen ${updatedDocument.category}.`,
          });

          return updatedDocument;
        },
        uploadedDocumentTransactionOptions,
      );

      return NextResponse.json({
        success: true,
        data: {
          document: await mapUploadedDocumentForReview(document),
        },
      });
    }

    if (action === "update-kuarters-unit") {
      const unitId = normalizeKuartersText(body?.unitId);
      const categoryId = normalizeKuartersText(body?.categoryId);
      const unitCode = normalizeKuartersText(body?.unitCode);

      if (!unitId || !categoryId || !unitCode) {
        return NextResponse.json(
          { success: false, message: "Data unit kuarters tidak lengkap." },
          { status: 400 },
        );
      }

      const document = await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const currentCategory = await getQuarterCategoryForDraft(tx, categoryId);

          if (!currentCategory) {
            throw new Error("Kategori kuarters tidak ditemui.");
          }

          const duplicateUnit = await findDuplicateUnitForCategory(
            tx,
            id,
            categoryId,
            unitId,
            unitCode,
            currentCategory.recordStatus === "VERIFIED",
          );

          if (duplicateUnit) {
            throw new Error(
              duplicateUnit.recordStatus === "VERIFIED"
                ? `Kod unit telah wujud dalam rekod sah untuk kategori ini: ${unitCode}.`
                : `Kod unit bertindih dalam dokumen ini untuk kategori yang sama: ${unitCode}.`,
            );
          }

          const updatedUnitCount = await tx.$executeRaw`
            UPDATE "Unit"
            SET "unitCode" = ${unitCode}, "updatedAt" = NOW()
            WHERE "id" = ${unitId}::uuid
              AND "categoryId" = ${categoryId}::uuid
              AND "uploadedDocumentId" = ${id}::uuid
              AND "recordStatus" = 'PENDING'::"RecordStatus"
          `;

          if (updatedUnitCount === 0) {
            throw new Error(`Unit kuarters tidak dapat dikemas kini: ${unitCode}.`);
          }

          const updatedDocument = await tx.uploadedDocument.findUnique({
            where: { id },
            include: {
              uploadedBy: {
                select: {
                  fullName: true,
                },
              },
            },
          });

          if (!updatedDocument) {
            throw new Error("Dokumen tidak ditemui.");
          }

          await createAuditLog(tx, {
            actor: currentAdmin,
            moduleName: "Muat Naik",
            targetData: `${updatedDocument.category} / ${updatedDocument.originalName ?? updatedDocument.fileName}`,
            actionType: "UPDATE",
            description: `Mengemaskini unit kuarters ${unitCode} dalam draf ekstrak dokumen ${updatedDocument.category}.`,
          });

          return updatedDocument;
        },
        uploadedDocumentTransactionOptions,
      );

      return NextResponse.json({
        success: true,
        data: {
          document: await mapUploadedDocumentForReview(document),
        },
      });
    }

    if (!extractResult) {
      return NextResponse.json(
        { success: false, message: "Data ekstrak tidak lengkap." },
        { status: 400 },
      );
    }

    const nextExtractResult =
      extractResult.documentType === "kuarters"
        ? (() => {
            const records = (extractResult.records as ExtractedQuarterRecord[])
              .map(normalizeKuartersRecord)
              .filter((record) => record.categoryName);

            return {
              ...extractResult,
              recordCount: records.length,
              totalUnits: records.reduce(
                (total, record) =>
                  total +
                  record.units.filter((unit) => unit.unitCode).length,
                0,
              ),
              records,
            };
          })()
        : extractResult;

    const document = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (nextExtractResult.documentType === "bayaran") {
          const nextPaymentIds = new Set(
            nextExtractResult.records
              .map((record: { paymentId?: string }) => record.paymentId)
              .filter(Boolean),
          );

          const existingPayments = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "Payment"
            WHERE "uploadedDocumentId" = ${id}::uuid
              AND "recordStatus" = 'PENDING'::"RecordStatus"
          `;
          const paymentIdsToDelete = existingPayments
            .map((payment) => payment.id)
            .filter((paymentId) => !nextPaymentIds.has(paymentId));

          if (paymentIdsToDelete.length > 0) {
            await tx.$executeRaw`
              DELETE FROM "Payment"
              WHERE "id" IN (${Prisma.join(
                paymentIdsToDelete.map((paymentId) => Prisma.sql`${paymentId}::uuid`),
              )})
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }

          const paymentDate = getBayaranPaymentDate(nextExtractResult.paymentMonth);

          for (const record of nextExtractResult.records) {
            if (!record.paymentId) {
              continue;
            }

            await tx.$executeRaw`
              UPDATE "Payment"
              SET
                "paymentDate" = ${paymentDate},
                "receiptNo" = ${record.noRujukan || null},
                "amount" = ${record.amaunRm}::numeric,
                "description" = ${record.catatan || "bayaran"},
                "updatedAt" = NOW()
              WHERE "id" = ${record.paymentId}::uuid
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }
        }

        if (nextExtractResult.documentType === "tunggakan") {
          const nextArrearsSummaryIds = new Set(
            nextExtractResult.records
              .filter(
                (record: { importStatus?: string }) =>
                  record.importStatus !== "IGNORED",
              )
              .map((record: { arrearsSummaryId?: string }) => record.arrearsSummaryId)
              .filter(Boolean),
          );

          const existingArrearsSummaries = await tx.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "ArrearsSummary"
            WHERE "uploadedDocumentId" = ${id}::uuid
              AND "recordStatus" = 'PENDING'::"RecordStatus"
          `;
          const arrearsSummaryIdsToDelete = existingArrearsSummaries
            .map((summary) => summary.id)
            .filter((summaryId) => !nextArrearsSummaryIds.has(summaryId));

          if (arrearsSummaryIdsToDelete.length > 0) {
            await tx.$executeRaw`
              DELETE FROM "ArrearsSummary"
              WHERE "id" IN (${Prisma.join(
                arrearsSummaryIdsToDelete.map(
                  (summaryId) => Prisma.sql`${summaryId}::uuid`,
                ),
              )})
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }

          for (const record of nextExtractResult.records) {
            if (!record.arrearsSummaryId || record.importStatus === "IGNORED") {
              continue;
            }

            await tx.$executeRaw`
              UPDATE "ArrearsSummary"
              SET
                "totalArrearsAmount" = ${record.jumlahTunggakan || "0"}::numeric,
                "description" = ${"tunggakan"},
                "updatedAt" = NOW()
              WHERE "id" = ${record.arrearsSummaryId}::uuid
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
          }
        }

        if (nextExtractResult.documentType === "kuarters") {
          for (const record of nextExtractResult.records) {
            if (!record.categoryId) {
              continue;
            }

            const currentCategory = await getQuarterCategoryForDraft(
              tx,
              record.categoryId,
            );
            const isPendingCategory =
              currentCategory?.recordStatus === "PENDING" &&
              currentCategory.uploadedDocumentId === id;

            if (isPendingCategory) {
              const verifiedCategoryId = await findVerifiedQuarterCategoryMatch(
                tx,
                record.categoryId,
                record.categoryName,
                record.address,
              );

              if (verifiedCategoryId) {
                await linkPendingCategoryToVerifiedCategory(
                  tx,
                  id,
                  record.categoryId,
                  verifiedCategoryId,
                );
                continue;
              }

              const pendingCategoryConflictId =
                await findPendingQuarterCategoryConflict(
                  tx,
                  id,
                  record.categoryId,
                  record.categoryName,
                  record.address,
                );

              if (pendingCategoryConflictId) {
                throw new Error(
                  `Kategori dan alamat kuarters bertindih dalam dokumen ini: ${record.categoryName}.`,
                );
              }

              const updatedCategoryCount = await tx.$executeRaw`
                UPDATE "QuarterCategory"
                SET
                  "categoryName" = ${record.categoryName},
                  "address" = ${record.address},
                  "rentalPrice" = ${record.rentalPrice}::numeric,
                  "maintenancePrice" = ${record.maintenancePrice}::numeric,
                  "penaltyPrice" = ${record.penaltyPrice}::numeric,
                  "updatedAt" = NOW()
                WHERE "id" = ${record.categoryId}::uuid
                  AND "uploadedDocumentId" = ${id}::uuid
                  AND "recordStatus" = 'PENDING'::"RecordStatus"
              `;

              if (updatedCategoryCount === 0) {
                throw new Error(
                  `Kategori kuarters tidak dapat dikemas kini: ${record.categoryName}.`,
                );
              }
            }

            // Handle units for the category
            const nextUnitIds = new Set(
              record.units
                .filter((unit: { unitCode?: string }) => Boolean(unit.unitCode))
                .map((unit: { unitId?: string }) => unit.unitId)
                .filter(Boolean),
            );
            const existingUnits = await tx.$queryRaw<{ id: string }[]>`
              SELECT "id"
              FROM "Unit"
              WHERE "categoryId" = ${record.categoryId}::uuid
                AND "uploadedDocumentId" = ${id}::uuid
                AND "recordStatus" = 'PENDING'::"RecordStatus"
            `;
            const unitIdsToDelete = existingUnits
              .map((unit) => unit.id)
              .filter((unitId) => !nextUnitIds.has(unitId));
            
            if (unitIdsToDelete.length > 0) {
              await tx.$executeRaw`
                DELETE FROM "Unit"
                WHERE "id" IN (${Prisma.join(
                  unitIdsToDelete.map((unitId) => Prisma.sql`${unitId}::uuid`),
                )})
                  AND "uploadedDocumentId" = ${id}::uuid
                  AND "recordStatus" = 'PENDING'::"RecordStatus"
              `;
            }

            for (const unit of record.units) {
              if (!unit.unitId || !unit.unitCode) {
                continue;
              }

              const duplicateUnit = await findDuplicateUnitForCategory(
                tx,
                id,
                record.categoryId,
                unit.unitId,
                unit.unitCode,
                currentCategory?.recordStatus === "VERIFIED",
              );

              if (duplicateUnit) {
                throw new Error(
                  duplicateUnit.recordStatus === "VERIFIED"
                    ? `Kod unit telah wujud dalam rekod sah untuk kategori ini: ${unit.unitCode}.`
                    : `Kod unit bertindih dalam dokumen ini untuk kategori yang sama: ${unit.unitCode}.`,
                );
              }

              const updatedUnitCount = await tx.$executeRaw`
                UPDATE "Unit"
                SET "unitCode" = ${unit.unitCode}, "updatedAt" = NOW()
                WHERE "id" = ${unit.unitId}::uuid
                  AND "uploadedDocumentId" = ${id}::uuid
                  AND "recordStatus" = 'PENDING'::"RecordStatus"
              `;

              if (updatedUnitCount === 0) {
                throw new Error(
                  `Unit kuarters tidak dapat dikemas kini: ${unit.unitCode}.`,
                );
              }
            }
          }
        }

        const updatedDocument = await tx.uploadedDocument.update({
          where: { id },
          data: {
            remark: JSON.stringify(nextExtractResult),
          },
          include: {
            uploadedBy: {
              select: {
                fullName: true,
              },
            },
          },
        });

        await createAuditLog(tx, {
          actor: currentAdmin,
          moduleName: "Muat Naik",
          targetData: `${updatedDocument.category} / ${updatedDocument.originalName ?? updatedDocument.fileName}`,
          actionType: "UPDATE",
          description: `Mengemaskini draf ekstrak dokumen ${updatedDocument.category}: ${updatedDocument.originalName ?? updatedDocument.fileName}.`,
        });

        return updatedDocument;
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      data: {
        document:
          nextExtractResult.documentType === "kuarters"
            ? await mapUploadedDocumentForReview(document)
            : mapUploadedDocumentForQueue(document),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal mengemas kini dokumen.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const currentAdmin = await getCurrentAdmin();
    const { id } = await context.params;

    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const document = await tx.uploadedDocument.findUnique({
          where: { id },
          select: {
            category: true,
            fileName: true,
            originalName: true,
          },
        });

        await tx.$executeRaw`
          DELETE FROM "Payment"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "ArrearsSummary"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "Unit"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "QuarterCategory"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.$executeRaw`
          DELETE FROM "Resident"
          WHERE "uploadedDocumentId" = ${id}::uuid
            AND "recordStatus" = 'PENDING'::"RecordStatus"
        `;
        await tx.uploadedDocument.delete({
          where: { id },
        });

        await createAuditLog(tx, {
          actor: currentAdmin,
          moduleName: "Muat Naik",
          targetData: `${document?.category ?? "DOKUMEN"} / ${document?.originalName ?? document?.fileName ?? id}`,
          actionType: "DELETE",
          description: `Memadam dokumen belum disahkan ${document?.category ?? "DOKUMEN"}: ${document?.originalName ?? document?.fileName ?? id}.`,
        });
      },
      uploadedDocumentTransactionOptions,
    );

    return NextResponse.json({
      success: true,
      message: "Dokumen berjaya dipadam.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal memadam dokumen.",
      },
      { status: 500 },
    );
  }
}
