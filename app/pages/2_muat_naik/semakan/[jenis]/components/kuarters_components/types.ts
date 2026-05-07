import type { ExtractedQuarterRecord } from "../../../../components/extract-review-shared";

export type KuartersPriceField =
  | "rentalPrice"
  | "maintenancePrice"
  | "penaltyPrice";

export type KuartersCategoryDraft = Pick<ExtractedQuarterRecord, KuartersPriceField>;
