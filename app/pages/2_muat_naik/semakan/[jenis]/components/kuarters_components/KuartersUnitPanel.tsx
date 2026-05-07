import Icon from "../../../../../../components/Icon";
import {
  type ExtractedQuarterUnit,
  Pagination,
} from "../../../../components/extract-review-shared";
import { getUnitKey } from "./helpers";

type KuartersUnitPanelProps = {
  units: ExtractedQuarterUnit[];
  pageUnits: ExtractedQuarterUnit[];
  unitDrafts: Record<string, string>;
  editingUnitKey: string | null;
  currentPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onDraftsChange: (updater: (currentDrafts: Record<string, string>) => Record<string, string>) => void;
  onStartEdit: (unitKey: string, unitCode: string) => void;
  onSaveUnit: (unitKey: string) => void;
};

export default function KuartersUnitPanel({
  units,
  pageUnits,
  unitDrafts,
  editingUnitKey,
  currentPage,
  totalPages,
  displayStart,
  displayEnd,
  onPageChange,
  onDraftsChange,
  onStartEdit,
  onSaveUnit,
}: KuartersUnitPanelProps) {
  return (
    <div className="border-t border-[#DCE2F1] lg:border-l lg:border-t-0">
      <div className="flex items-center justify-between bg-[#F7F9FF] px-5 py-4 text-[10px] font-extrabold uppercase text-dark-blue">
        Senarai Unit
        <Icon icon="add_circle" size={15} weight={700} />
      </div>
      <div className="grid grid-cols-[1fr_64px] border-b border-[#EEF1F7] px-5 py-3 text-[10px] font-extrabold uppercase text-[#667085]">
        <span>ID Unit</span>
        <span className="text-center">Tindakan</span>
      </div>
      {pageUnits.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs font-semibold text-[#667085]">
          Tiada unit baharu.
        </div>
      ) : (
        pageUnits.map((unit) => {
          const unitKey = getUnitKey(unit);
          const isEditing = editingUnitKey === unitKey;

          return (
            <div
              key={unitKey}
              className="grid grid-cols-[1fr_64px] items-center px-5 py-4 text-xs"
            >
              <span>
                {isEditing ? (
                  <input
                    className="h-9 w-full rounded border border-[#E6EAF2] px-3 font-extrabold"
                    value={unitDrafts[unitKey] ?? unit.unitCode}
                    onChange={(event) =>
                      onDraftsChange((currentDrafts) => ({
                        ...currentDrafts,
                        [unitKey]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <span className="font-extrabold text-[#172033]">
                    {unit.unitCode}
                  </span>
                )}
                {unit.address ? (
                  <span className="block text-[10px] font-semibold text-[#667085]">
                    {unit.address}
                  </span>
                ) : null}
              </span>
              <span className="flex justify-center gap-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      aria-label="Simpan perubahan unit"
                      onClick={() => onSaveUnit(unitKey)}
                    >
                      <Icon icon="save" size={15} weight={700} className="text-green" />
                    </button>
                    <button type="button" aria-label="Padam unit">
                      <Icon icon="delete" size={15} weight={700} className="text-red" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    aria-label="Edit unit"
                    onClick={() => onStartEdit(unitKey, unit.unitCode)}
                  >
                    <Icon
                      icon="edit"
                      size={15}
                      weight={700}
                      className="text-dark-blue"
                    />
                  </button>
                )}
              </span>
            </div>
          );
        })
      )}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        label={`Memaparkan ${displayStart}-${displayEnd} daripada ${units.length} Unit`}
        showLabel={false}
      />
    </div>
  );
}
