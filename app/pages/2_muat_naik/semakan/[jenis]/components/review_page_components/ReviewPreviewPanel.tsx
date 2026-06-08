import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
  KuartersExtractResult,
  BayaranExtractResult,
  PenghuniExtractResult,
} from "../../../../components/extract-review-shared";
import ReviewTable from "./ReviewTable";
import type { ReviewKind } from "./types";
import type { GlobalFixedNotice } from "@/app/components/Message/GlobalFixedMessage";

type ReviewPreviewPanelProps = {
  kind: ReviewKind;
  isLoading?: boolean;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => ExtractedBayaranRecord | void | Promise<ExtractedBayaranRecord | void>;
  bayaranParsingMode?: BayaranExtractResult["parsingMode"];
  penghuniRecords: ExtractedPenghuniRecord[];
  penghuniParsingMode?: PenghuniExtractResult["parsingMode"];
  onPenghuniRecordsChange?: (
    records: ExtractedPenghuniRecord[],
  ) => ExtractedPenghuniRecord | void | Promise<ExtractedPenghuniRecord | void>;
  onPenghuniRecordDelete?: (record: ExtractedPenghuniRecord) => Promise<void>;
  kuartersRecords: ExtractedQuarterRecord[];
  kuartersParsingMode?: KuartersExtractResult["parsingMode"];
  onKuartersRecordsChange?: (records: ExtractedQuarterRecord[]) => Promise<void>;
  onKuartersCategoryChange?: (params: {
    categoryId: string;
    categoryName: string;
    address: string;
    rentalPrice: string;
    maintenancePrice: string;
    penaltyPrice: string;
  }) => Promise<void>;
  onKuartersUnitChange?: (params: {
    categoryId: string;
    unitId: string;
    unitCode: string;
  }) => Promise<void>;
  onKuartersCategoryDelete?: (params: { categoryId: string }) => Promise<void>;
  onKuartersUnitDelete?: (params: {
    categoryId: string;
    unitId: string;
  }) => Promise<void>;
  tunggakanRecords: ExtractedTunggakanRecord[];
  tunggakanParsingMode?: "strict" | "assisted";
  onTunggakanRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => ExtractedTunggakanRecord | void | Promise<ExtractedTunggakanRecord | void>;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  onNotice?: (tone: GlobalFixedNotice["tone"], message: string) => void;
};

export default function ReviewPreviewPanel(props: ReviewPreviewPanelProps) {
  const hasInternalHeader = props.kind === "tunggakan" || props.kind === "bayaran" || props.kind === "penghuni";

  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE7FF] bg-light-blue shadow-sm">
      {!hasInternalHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#07162F]">
              Pratinjau Data Ekstrak
            </h2>
            <p className="text-xs font-medium text-[#344054]">
              Sila semak maklumat sebelum pengesahan.
            </p>
          </div>
        </div>
      ) : null}
      <div className={hasInternalHeader ? "" : "px-2 pb-2"}>
        {props.isLoading && !hasInternalHeader ? <ReviewTableLoading /> : <ReviewTable {...props} />}
      </div>
    </div>
  );
}

function ReviewTableLoading() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-xl border border-light-grey/20 bg-white px-6 py-16 text-center">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-light-grey/40 border-t-dark-blue"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-extrabold text-dark-blue">
          Memuatkan data semakan...
        </p>
        <p className="mt-1 text-xs font-medium text-grey">
          Sila tunggu sebentar sementara rekod disediakan.
        </p>
      </div>
    </div>
  );
}
