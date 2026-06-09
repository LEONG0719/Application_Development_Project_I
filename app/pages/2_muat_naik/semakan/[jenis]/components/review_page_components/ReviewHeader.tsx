import Icon from "../../../../../../components/Icon/Icon";

type ReviewHeaderProps = {
  fileName: string;
  onReviewLater: () => void;
  parsingMode?: "strict" | "assisted";
};

export default function ReviewHeader({
  fileName,
  onReviewLater,
  parsingMode,
}: ReviewHeaderProps) {
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex w-full items-start justify-between gap-4">
      {/* Return Button */}
      <button
        type="button"
        className="fixed left-61 top-6 z-40 inline-flex min-h-10 items-center gap-2 rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-bold text-grey shadow-2xl transition-colors hover:border-dark-blue hover:text-dark-blue"
        onClick={onReviewLater}
      >
        <Icon icon="arrow_back" size={18} />
        Semak Nanti
      </button>

      {/* Header */}
      <div className="flex items-center justify-center gap-4">
        {/* File Type */}
        <span
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded",
            isPdf ? "bg-[#FFEAEA] text-red" : "bg-[#EAF8EF] text-green",
          ].join(" ")}
        >
          <Icon
            icon={isPdf ? "picture_as_pdf" : "table"}
            size={22}
            filled
            weight={700}
          />
        </span>

        {/* File Name */}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold">{fileName}</h1>
          <p className="text-sm font-extralight text-grey/70">Sila sahkan ketepatan data yang telah diekstrak secara automatik.</p>
        </div>
      </div>

      {/* Parsing Mode */}
      {parsingMode && (
        <span className="shrink-0 rounded border border-[#C9D6F2] bg-white px-3 py-1.5 text-[11px] font-extrabold text-dark-blue self-center">
          {parsingMode === "assisted" ? "Mod Bantuan AI" : "Mod Ketat"}
        </span>
      )}
    </div>
  );
}
