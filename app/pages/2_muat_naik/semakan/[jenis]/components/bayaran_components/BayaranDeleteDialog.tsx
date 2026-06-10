import Icon from "../../../../../../components/Icon/Icon";
import type { BayaranReviewRowModel } from "./types";

type BayaranDeleteDialogProps = {
  row: BayaranReviewRowModel | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function BayaranDeleteDialog({
  row,
  onCancel,
  onConfirm,
}: BayaranDeleteDialogProps) {
  if (!row) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-static-dark/35 px-4">
      <div className="w-full max-w-md rounded-xl border border-red/30 bg-surface p-6 shadow-[0_22px_55px_rgba(15,23,42,0.22)]">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-danger-surface text-red">
            <Icon icon="delete" size={24} weight={700} />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold leading-6 text-content">
              Padam Rekod Bayaran?
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-content-muted">
              Sahkan untuk memadam maklumat bayaran penghuni ini daripada
              senarai semakan.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border bg-surface-muted px-4 py-3">
          <p className="text-[10px] font-extrabold uppercase text-content-muted">
            Penghuni
          </p>
          <p className="mt-1 font-extrabold text-content">{row.nama}</p>
          <p className="mt-1 text-xs font-semibold text-content-muted">
            {row.noGajiNoKp} · RM {row.amaunRm}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="h-11 rounded-lg border border-border bg-surface px-5 text-xs font-extrabold text-content shadow-sm transition hover:bg-surface-muted"
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            type="button"
            className="h-11 rounded-lg bg-red px-5 text-xs font-extrabold text-white shadow-sm transition hover:bg-red/90"
            onClick={onConfirm}
          >
            Ya, Padam
          </button>
        </div>
      </div>
    </div>
  );
}
