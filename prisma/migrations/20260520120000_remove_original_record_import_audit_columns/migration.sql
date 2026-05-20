ALTER TABLE "Resident"
  DROP COLUMN IF EXISTS "uploadedDocumentId",
  DROP COLUMN IF EXISTS "createdById",
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";

ALTER TABLE "QuarterCategory"
  DROP COLUMN IF EXISTS "uploadedDocumentId",
  DROP COLUMN IF EXISTS "createdById",
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";

ALTER TABLE "Unit"
  DROP COLUMN IF EXISTS "uploadedDocumentId",
  DROP COLUMN IF EXISTS "createdById",
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";

ALTER TABLE "ArrearsSummary"
  DROP COLUMN IF EXISTS "uploadedDocumentId",
  DROP COLUMN IF EXISTS "createdById",
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";

ALTER TABLE "MonthlyCharge"
  DROP COLUMN IF EXISTS "createdById",
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";

ALTER TABLE "Payment"
  DROP COLUMN IF EXISTS "uploadedDocumentId",
  DROP COLUMN IF EXISTS "createdById",
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";

ALTER TABLE "Transaction"
  DROP COLUMN IF EXISTS "createdById";

ALTER TABLE "UploadedDocument"
  DROP COLUMN IF EXISTS "verifiedById",
  DROP COLUMN IF EXISTS "verifiedAt";
