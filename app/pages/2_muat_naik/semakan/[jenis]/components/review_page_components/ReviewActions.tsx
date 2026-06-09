import Icon from "../../../../../../components/Icon/Icon";
import type { VerifyingMode } from "./types";

type ReviewActionsProps = {
  verifyingMode: VerifyingMode | null;
  onVerify: (mode: VerifyingMode) => void;
  selectedCount: number;
};

export default function ReviewActions({
  verifyingMode,
  onVerify,
  selectedCount,
}: ReviewActionsProps) {
  // Sahkan Data Button
  return (
    <button
      type="button"
      className="fixed bottom-8 right-8 z-40 flex gap-2 p-4 items-center justify-center rounded-lg bg-dark-blue text-white shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
      onClick={() => onVerify("selected")}
      disabled={verifyingMode !== null}
    >
      <Icon icon="settings_backup_restore" size={15} weight={400} />
      <span className="font-bold text-xs">
        {verifyingMode === "selected"
          ? "Mengesahkan..."
          : selectedCount > 0
            ? `Sahkan Data (${selectedCount})`
            : "Sahkan Data"}
      </span>
    </button>
  );
}
