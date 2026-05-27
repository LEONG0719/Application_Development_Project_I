import Icon from "@/app/components/Icon/Icon";
import { InputBox, InputField, Topic } from "@/app/components/InputField";
import SearchingDetailDataOverlay from "@/app/components/Loading/SearchingDetailDataOverlay";

import {
  formatEnumLabel,
  type AuditLogDetailItem,
} from "./auditLogClient";
import { getAuditActionBadgeColor } from "./auditLogActionColor";

function getAuditActionTextClass(actionType: string) {
  const badgeClass = getAuditActionBadgeColor(actionType);
  return badgeClass
    .split(" ")
    .find((className) => className.startsWith("text-")) ?? "text-slate-800";
}

export default function AuditLogDetailOverlay({
  auditLog,
  isLoading,
  errorMessage,
  onRetry,
  onClose,
}: {
  auditLog: AuditLogDetailItem | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed top-0 left-55 right-0 bottom-0 z-50 bg-black/40 backdrop-blur-sm p-12 flex items-start justify-center">
      <section
        className="relative w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-full bg-light-blue"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-details-title"
      >
        <header className="bg-dark-blue p-6 flex items-center justify-between">
          <div className="min-w-0">
            <h3
              id="audit-details-title"
              className="font-bold text-lg text-white"
            >
              MAKLUMAT JEJAK AUDIT
            </h3>
            <p className="font-extralight text-xs text-light-grey">
              REKOD AKTIVITI SISTEM
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:scale-96 active:scale-92 text-white"
            aria-label="Tutup butiran audit"
          >
            <Icon icon="close" size={20} />
          </button>
        </header>

        {isLoading ? (
          <SearchingDetailDataOverlay
            mode="loading"
            loadingMessage="Mendapatkan Butiran Jejak Audit..."
          />
        ) : errorMessage ? (
          <SearchingDetailDataOverlay
            mode="warning"
            title="Maklumat Tidak Dapat Dipaparkan"
            message={errorMessage}
            onRetry={onRetry}
            retryLabel="Cuba Lagi"
          />
        ) : auditLog ? (
          <div className="p-6 bg-light-blue overflow-y-auto">
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-4">
                <Topic content="MAKLUMAT AKTIVITI" />
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="TARIKH & MASA"
                    value={auditLog.timestampLabel}
                    state="inactive"
                    className="col-span-1"
                  />
                  <InputField
                    label="MODUL"
                    value={auditLog.module}
                    state="inactive"
                    className="col-span-1"
                  />
                  <InputField
                    label="JENIS TINDAKAN"
                    value={formatEnumLabel(auditLog.actionType)}
                    state="inactive"
                    inactiveBackgroundClass={`bg-transparent ${getAuditActionTextClass(auditLog.actionType)}`}
                    className="col-span-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="PENGENDALI"
                    value={auditLog.actor}
                    state="inactive"
                    className="col-span-1"
                  />
                  <InputField
                    label="SASARAN DATA"
                    value={auditLog.targetData ?? auditLog.target}
                    state="inactive"
                    className="col-span-1"
                  />
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <Topic content="PENERANGAN PERUBAHAN" />
                <InputBox
                  label="CATATAN"
                  value={auditLog.description || "N/A"}
                  state="inactive"
                  className="col-span-2"
                  inputMinHeight={140}
                />
              </section>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-light-blue overflow-y-auto">
            <div className="flex min-h-108 items-center justify-center">
              <div className="w-full max-w-md rounded-xl border border-red/20 bg-white p-6 text-center">
                <h4 className="text-lg font-extrabold text-dark-grey">
                  Rekod tidak ditemui
                </h4>
                <p className="mt-2 text-sm leading-6 text-grey">
                  Rekod audit ini mungkin telah dipadam atau tidak termasuk dalam
                  rekod operasi.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
