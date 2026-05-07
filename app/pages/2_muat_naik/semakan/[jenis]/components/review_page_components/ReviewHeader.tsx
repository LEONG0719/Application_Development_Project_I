import Icon from "../../../../../../components/Icon";

type ReviewHeaderProps = {
  fileName: string;
  onReviewLater: () => void;
};

export default function ReviewHeader({
  fileName,
  onReviewLater,
}: ReviewHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#FFEAEA] text-red">
          <Icon icon="picture_as_pdf" size={22} filled weight={700} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-extrabold leading-tight text-[#07162F]">
            {fileName}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#667085]">
            Sila sahkan ketepatan data yang telah diekstrak secara automatik.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded border border-[#E1E5EF] bg-white px-6 text-xs font-extrabold text-[#344054] shadow-sm"
        onClick={onReviewLater}
      >
        <Icon icon="history" size={16} weight={600} />
        Semak Nanti
      </button>
    </div>
  );
}
