import type { ExtractedQuarterRecord } from "../../../../components/extract-review-shared";

export function getKuartersRecordKey(record: ExtractedQuarterRecord) {
  return record.categoryId ?? record.id;
}

export function getUnitKey(unit: {
  sourceSheet: string;
  sourceRow: number;
  unitCode: string;
}) {
  return `${unit.sourceSheet}-${unit.sourceRow}-${unit.unitCode}`;
}
