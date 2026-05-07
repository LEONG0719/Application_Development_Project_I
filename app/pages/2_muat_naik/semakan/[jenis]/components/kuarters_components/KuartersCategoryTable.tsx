import Icon from "../../../../../../components/Icon";
import {
  type ExtractedQuarterRecord,
  Pagination,
} from "../../../../components/extract-review-shared";
import { getKuartersRecordKey } from "./helpers";
import type { KuartersCategoryDraft, KuartersPriceField } from "./types";

type KuartersCategoryTableProps = {
  categories: ExtractedQuarterRecord[];
  pageCategories: ExtractedQuarterRecord[];
  selectedCategoryId: string;
  selectedKeys: Set<string>;
  editingCategoryId: string | null;
  categoryDrafts: Record<string, KuartersCategoryDraft>;
  currentPage: number;
  totalPages: number;
  displayStart: number;
  displayEnd: number;
  onPageChange: (page: number) => void;
  onSelectCategory: (categoryId: string) => void;
  onToggleCategory: (categoryKey: string, checked: boolean) => void;
  onStartEdit: (category: ExtractedQuarterRecord) => void;
  onUpdateDraft: (
    categoryId: string,
    field: KuartersPriceField,
    value: string,
  ) => void;
  onSaveCategory: (categoryId: string) => void;
};

const priceFields: Array<[KuartersPriceField, string]> = [
  ["rentalPrice", "Sewa (RM)"],
  ["maintenancePrice", "Senggara (RM)"],
  ["penaltyPrice", "Penalti (RM)"],
];

export default function KuartersCategoryTable({
  categories,
  pageCategories,
  selectedCategoryId,
  selectedKeys,
  editingCategoryId,
  categoryDrafts,
  currentPage,
  totalPages,
  displayStart,
  displayEnd,
  onPageChange,
  onSelectCategory,
  onToggleCategory,
  onStartEdit,
  onUpdateDraft,
  onSaveCategory,
}: KuartersCategoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-left text-xs">
        <thead className="bg-[#F7F9FF] text-[10px] font-extrabold uppercase text-[#667085]">
          <tr>
            <th className="w-10 px-5 py-4">
              <input type="checkbox" className="h-4 w-4" />
            </th>
            <th className="px-4 py-4">Kategori</th>
            {priceFields.map(([, label]) => (
              <th key={label} className="px-4 py-4 text-right">
                {label}
              </th>
            ))}
            <th className="px-4 py-4 text-center">Tindakan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EEF1F7]">
          {pageCategories.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
              >
                Tiada kategori atau unit kuarters baharu ditemui.
              </td>
            </tr>
          ) : (
            pageCategories.map((category) => {
              const isSelected = category.id === selectedCategoryId;
              const selectionKey = getKuartersRecordKey(category);
              const isEditing = editingCategoryId === category.id;

              return (
                <tr
                  key={category.id}
                  className={isSelected ? "bg-[#FBFCFF]" : undefined}
                  onClick={() => onSelectCategory(category.id)}
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(selectionKey)}
                      className="h-4 w-4 accent-dark-blue"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onToggleCategory(selectionKey, event.target.checked)
                      }
                    />
                  </td>
                  <td className="px-4 py-4 font-extrabold text-[#172033]">
                    <p>{category.categoryName}</p>
                    <p className="text-[10px] font-semibold text-[#667085]">
                      {category.unitCount} unit
                    </p>
                  </td>
                  {priceFields.map(([field]) => {
                    const value = category[field];
                    const draftValue = categoryDrafts[category.id]?.[field] ?? value;

                    return (
                      <td
                        key={`${category.id}-${field}`}
                        className="px-4 py-4 text-right"
                      >
                        {isEditing ? (
                          <input
                            className="h-9 w-22 rounded border border-[#E6EAF2] px-3 text-right font-extrabold"
                            value={draftValue}
                            onChange={(event) =>
                              onUpdateDraft(category.id, field, event.target.value)
                            }
                          />
                        ) : (
                          <span className="font-extrabold text-[#172033]">
                            {value}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-4">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            aria-label="Simpan perubahan kategori"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSaveCategory(category.id);
                            }}
                          >
                            <Icon
                              icon="save"
                              size={16}
                              weight={700}
                              className="text-green"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Padam kategori"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Icon
                              icon="delete"
                              size={16}
                              weight={700}
                              className="text-red"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Sembunyikan senarai unit"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectCategory(category.id);
                            }}
                          >
                            <Icon
                              icon="chevron_left"
                              size={16}
                              weight={700}
                              className="text-[#98A2B3]"
                            />
                          </button>
                        </>
                      ) : (
                        <>
                          <Icon
                            icon="check_circle"
                            size={16}
                            weight={700}
                            className="text-green"
                          />
                          <button
                            type="button"
                            aria-label="Edit kategori"
                            onClick={(event) => {
                              event.stopPropagation();
                              onStartEdit(category);
                            }}
                          >
                            <Icon
                              icon="edit"
                              size={16}
                              weight={700}
                              className="text-dark-blue"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label="Lihat senarai unit"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelectCategory(category.id);
                            }}
                          >
                            <Icon
                              icon="chevron_right"
                              size={16}
                              weight={700}
                              className="text-[#98A2B3]"
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        label={`Memaparkan ${displayStart}-${displayEnd} daripada ${categories.length} Kategori`}
      />
    </div>
  );
}
