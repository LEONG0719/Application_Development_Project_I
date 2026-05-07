import Icon from "../../../../../../components/Icon";
import type { VerifyingMode } from "./types";

type ReviewActionsProps = {
  addLabel: string;
  verifyingMode: VerifyingMode | null;
  verificationMessage: string;
  onVerify: (mode: VerifyingMode) => void;
};

export default function ReviewActions({
  addLabel,
  verifyingMode,
  verificationMessage,
  onVerify,
}: ReviewActionsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-dark-blue px-6 text-xs font-extrabold text-white shadow-sm">
          <Icon icon="add" size={16} weight={700} />
          {addLabel}
        </button>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-dark-blue px-7 text-xs font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#6B7280]"
            onClick={() => onVerify("selected")}
            disabled={verifyingMode === "selected"}
          >
            <Icon icon="settings_backup_restore" size={15} weight={700} />
            {verifyingMode === "selected" ? "Mengesahkan..." : "Sahkan Data"}
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-green px-7 text-xs font-extrabold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-[#6B7280]"
            onClick={() => onVerify("all")}
            disabled={verifyingMode === "all"}
          >
            <Icon icon="done_all" size={15} weight={700} />
            {verifyingMode === "all" ? "Mengesahkan..." : "Sahkan Semua Data"}
          </button>
        </div>
      </div>
      {verificationMessage ? (
        <p className="text-right text-xs font-bold text-red">
          {verificationMessage}
        </p>
      ) : null}
    </>
  );
}
