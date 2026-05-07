import Icon from "../../../../../../components/Icon";
import type {
  ExtractedBayaranRecord,
  ExtractedPenghuniRecord,
  ExtractedQuarterRecord,
  ExtractedTunggakanRecord,
} from "../../../../components/extract-review-shared";
import ReviewTable from "./ReviewTable";
import type { ReviewKind } from "./types";

type ReviewPreviewPanelProps = {
  kind: ReviewKind;
  bayaranRecords: ExtractedBayaranRecord[];
  onBayaranTotalAmountChange?: (totalAmount: string) => void;
  onBayaranRecordsChange?: (
    records: ExtractedBayaranRecord[],
    totalAmount: string,
  ) => void;
  penghuniRecords: ExtractedPenghuniRecord[];
  kuartersRecords: ExtractedQuarterRecord[];
  tunggakanRecords: ExtractedTunggakanRecord[];
  onTunggakanRecordsChange?: (
    records: ExtractedTunggakanRecord[],
    totalAmount: string,
  ) => void;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
};

export default function ReviewPreviewPanel(props: ReviewPreviewPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#DCE7FF] bg-light-blue shadow-sm">
      <div className="flex items-start justify-between px-5 py-5">
        <div>
          <h2 className="text-lg font-extrabold text-[#07162F]">
            Pratinjau Data Ekstrak
          </h2>
          <p className="text-xs font-medium text-[#344054]">
            Sila semak maklumat sebelum pengesahan.
          </p>
        </div>
        <Icon icon="filter_alt" size={22} weight={500} className="text-[#667085]" />
      </div>
      <div className="px-2 pb-2">
        <ReviewTable {...props} />
      </div>
    </div>
  );
}
