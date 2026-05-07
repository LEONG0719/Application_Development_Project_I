"use client";

import { useState } from "react";
import {
  type ExtractedQuarterRecord,
  QUARTER_CATEGORIES_PER_PAGE,
  QUARTER_UNITS_PER_PAGE,
} from "../../../../components/extract-review-shared";
import { getUnitKey } from "./helpers";
import KuartersCategoryTable from "./KuartersCategoryTable";
import KuartersUnitPanel from "./KuartersUnitPanel";
import type { KuartersCategoryDraft, KuartersPriceField } from "./types";

type KuartersReviewTableProps = {
  records: ExtractedQuarterRecord[];
  selectedKeys?: string[];
  onSelectedKeysChange?: (keys: string[]) => void;
};

export default function KuartersReviewTable({
  records,
  selectedKeys = [],
  onSelectedKeysChange,
}: KuartersReviewTableProps) {
  const [categories, setCategories] = useState<ExtractedQuarterRecord[]>(records);
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<string, KuartersCategoryDraft>
  >({});
  const [unitDrafts, setUnitDrafts] = useState<Record<string, string>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingUnitKey, setEditingUnitKey] = useState<string | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [unitPage, setUnitPage] = useState(1);

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? null;
  const totalCategoryPages = Math.max(
    1,
    Math.ceil(categories.length / QUARTER_CATEGORIES_PER_PAGE),
  );
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const categoryStartIndex = (safeCategoryPage - 1) * QUARTER_CATEGORIES_PER_PAGE;
  const pageCategories = categories.slice(
    categoryStartIndex,
    categoryStartIndex + QUARTER_CATEGORIES_PER_PAGE,
  );
  const categoryDisplayStart = categories.length === 0 ? 0 : categoryStartIndex + 1;
  const categoryDisplayEnd = categoryStartIndex + pageCategories.length;
  const units = selectedCategory?.units ?? [];
  const totalUnitPages = Math.max(1, Math.ceil(units.length / QUARTER_UNITS_PER_PAGE));
  const safeUnitPage = Math.min(unitPage, totalUnitPages);
  const unitStartIndex = (safeUnitPage - 1) * QUARTER_UNITS_PER_PAGE;
  const pageUnits = units.slice(
    unitStartIndex,
    unitStartIndex + QUARTER_UNITS_PER_PAGE,
  );
  const unitDisplayStart = units.length === 0 ? 0 : unitStartIndex + 1;
  const unitDisplayEnd = unitStartIndex + pageUnits.length;
  const selectedKeySet = new Set(selectedKeys);

  const selectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setUnitPage(1);
    setEditingUnitKey(null);
  };

  const toggleSelectedCategory = (categoryKey: string, checked: boolean) => {
    const nextKeys = new Set(selectedKeys);

    if (checked) {
      nextKeys.add(categoryKey);
    } else {
      nextKeys.delete(categoryKey);
    }

    onSelectedKeysChange?.([...nextKeys]);
  };

  const startCategoryEdit = (category: ExtractedQuarterRecord) => {
    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [category.id]: {
        rentalPrice: category.rentalPrice,
        maintenancePrice: category.maintenancePrice,
        penaltyPrice: category.penaltyPrice,
      },
    }));
    setEditingCategoryId(category.id);
  };

  const updateCategoryDraft = (
    categoryId: string,
    field: KuartersPriceField,
    value: string,
  ) => {
    setCategoryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [categoryId]: {
        rentalPrice: currentDrafts[categoryId]?.rentalPrice ?? "",
        maintenancePrice: currentDrafts[categoryId]?.maintenancePrice ?? "",
        penaltyPrice: currentDrafts[categoryId]?.penaltyPrice ?? "",
        [field]: value,
      },
    }));
  };

  const saveCategory = (categoryId: string) => {
    const draft = categoryDrafts[categoryId];

    if (!draft) {
      setEditingCategoryId(null);
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, ...draft } : category,
      ),
    );
    setEditingCategoryId(null);
  };

  const startUnitEdit = (unitKey: string, unitCode: string) => {
    setUnitDrafts((currentDrafts) => ({
      ...currentDrafts,
      [unitKey]: unitCode,
    }));
    setEditingUnitKey(unitKey);
  };

  const saveUnit = (unitKey: string) => {
    const draftUnitCode = unitDrafts[unitKey];

    if (!draftUnitCode || !selectedCategory) {
      setEditingUnitKey(null);
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === selectedCategory.id
          ? {
              ...category,
              units: category.units.map((unit) =>
                getUnitKey(unit) === unitKey
                  ? { ...unit, unitCode: draftUnitCode }
                  : unit,
              ),
            }
          : category,
      ),
    );
    setEditingUnitKey(null);
  };

  return (
    <div className="grid overflow-hidden rounded-lg border border-[#DCE2F1] bg-white lg:grid-cols-[1fr_240px]">
      <KuartersCategoryTable
        categories={categories}
        pageCategories={pageCategories}
        selectedCategoryId={selectedCategoryId}
        selectedKeys={selectedKeySet}
        editingCategoryId={editingCategoryId}
        categoryDrafts={categoryDrafts}
        currentPage={safeCategoryPage}
        totalPages={totalCategoryPages}
        displayStart={categoryDisplayStart}
        displayEnd={categoryDisplayEnd}
        onPageChange={setCategoryPage}
        onSelectCategory={selectCategory}
        onToggleCategory={toggleSelectedCategory}
        onStartEdit={startCategoryEdit}
        onUpdateDraft={updateCategoryDraft}
        onSaveCategory={saveCategory}
      />

      <KuartersUnitPanel
        units={units}
        pageUnits={pageUnits}
        unitDrafts={unitDrafts}
        editingUnitKey={editingUnitKey}
        currentPage={safeUnitPage}
        totalPages={totalUnitPages}
        displayStart={unitDisplayStart}
        displayEnd={unitDisplayEnd}
        onPageChange={setUnitPage}
        onDraftsChange={setUnitDrafts}
        onStartEdit={startUnitEdit}
        onSaveUnit={saveUnit}
      />
    </div>
  );
}
