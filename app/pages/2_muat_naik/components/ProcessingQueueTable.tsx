"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Icon from "@/app/components/Icon/Icon";
import { InputField as SharedInputField } from "@/app/components/InputField";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import FilterDate from "@/app/components/Filter/FilterDate";
import type { ProcessingDraftSummary } from "./extract-review-shared";
import { formatDraftDateTime } from "./extract-review-shared";
import type { Category } from "./types";

type ProcessingQueueTableProps = {
  activeCategory: Category;
  rows: ProcessingDraftSummary[];
  isLoading: boolean;
  onContinueDraft: (draft: ProcessingDraftSummary) => void;
  onDeleteDraft: (draftId: string) => void;
};

function getDraftIcon(draft: ProcessingDraftSummary) {
  return draft.fileName.toLowerCase().endsWith(".pdf")
    ? "picture_as_pdf"
    : "table";
}

function getDraftTone(draft: ProcessingDraftSummary) {
  return draft.fileName.toLowerCase().endsWith(".pdf") ? "red" : "green";
}

export default function ProcessingQueueTable({
  activeCategory,
  rows,
  isLoading,
  onContinueDraft,
  onDeleteDraft,
}: ProcessingQueueTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [isDateOpen, setIsDateOpen] = useState(false);

  const datePanelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Close DateFilter on clicking outside
  useEffect(() => {
    if (!isDateOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (target instanceof Element && target.closest("[data-filter-date-calendar]")) return;

      if (datePanelRef.current?.contains(target)) return;

      setIsDateOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isDateOpen]);

  // Focus search input when toggled open
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.querySelector("input")?.focus();
    }
  }, [isSearchOpen]);

  function handleToggleSearch() {
    if (isSearchOpen) {
      setSearchQuery("");
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
    }
  }

  function handleClearSearch() {
    setSearchQuery("");
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Search Query Filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          row.fileName.toLowerCase().includes(query) ||
          row.uploadedBy.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Date Filter
      if (dateFilter.startDate || dateFilter.endDate) {
        const rowTime = new Date(row.uploadedAt).getTime();

        if (dateFilter.startDate) {
          const start = new Date(`${dateFilter.startDate}T00:00:00`).getTime();
          if (rowTime < start) return false;
        }

        if (dateFilter.endDate) {
          const end = new Date(`${dateFilter.endDate}T23:59:59.999`).getTime();
          if (rowTime > end) return false;
        }
      }

      return true;
    });
  }, [rows, searchQuery, dateFilter]);

  const isDateActive = Boolean(dateFilter.startDate || dateFilter.endDate);

  return (
    <div className="flex flex-col gap-3">
      {/* Header section with Title, Badge, and Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-extrabold text-[#07162F]">
            Barisan Pemprosesan
          </h2>
          <span className="rounded-full bg-[#DDE8FF] px-3 py-1 text-[11px] font-extrabold text-[#2D4A9A]">
            {filteredRows.length} Fail {activeCategory} Sedang Menunggu
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle Button */}
          <ToolbarIconButton
            icon="search"
            label="Cari fail"
            isActive={isSearchOpen || searchQuery.trim().length > 0}
            onClick={handleToggleSearch}
          />

          {/* Date Filter Button & Dropdown */}
          <div ref={datePanelRef} className="relative">
            <ToolbarIconButton
              icon="calendar_month"
              label="Tapis tarikh"
              isActive={isDateOpen || isDateActive}
              onClick={() => setIsDateOpen((prev) => !prev)}
            />

            {isDateOpen ? (
              <FilterDate
                title="Tarikh"
                description="Tapis tarikh dokumen dimuat naik."
                ariaLabel="Tapisan tarikh dokumen"
                value={dateFilter}
                onApply={(value) => {
                  setDateFilter(value);
                }}
                onClear={() => {
                  setDateFilter({ startDate: "", endDate: "" });
                  setIsDateOpen(false);
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Search Input Panel */}
      {isSearchOpen ? (
        <div className="rounded-xl border border-[#DCE2F1] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div ref={searchInputRef} className="flex-1">
              <SharedInputField
                label="CARIAN MENGIKUT NAMA DOKUMEN ATAU PEMUAT NAIK"
                value={searchQuery}
                state="active"
                onChange={setSearchQuery}
                placeholder="Cth: bayaran.pdf atau Ahmad..."
                showLabel
                leadingIcon={
                  <Icon
                    icon="search"
                    size={18}
                    className="text-light-grey"
                  />
                }
                className="w-full"
                activeBackgroundClass="bg-light-blue"
                inputFontSize={12}
                inputMinHeight={40}
              />
            </div>
            <div className="flex items-center gap-3 self-start lg:self-end">
              <button
                type="button"
                className="inline-flex min-h-10 items-center rounded-xl border border-light-grey/25 bg-white px-4 py-2 text-sm font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-40"
                disabled={searchQuery.trim().length === 0}
                onClick={handleClearSearch}
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#DCE2F1] bg-white shadow-sm">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="bg-light-blue text-[10px] font-extrabold uppercase tracking-wide text-[#4B5567]">
            <tr>
              <th className="w-[38%] px-6 py-4">Nama Dokumen</th>
              <th className="w-[20%] px-5 py-4">Pemuat Naik</th>
              <th className="w-[28%] px-5 py-4">Tarikh & Masa</th>
              <th className="w-[14%] px-5 py-4 text-center">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF1F7] text-xs">
            {isLoading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                >
                  Memuatkan barisan pemprosesan...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                >
                  Tiada fail {activeCategory.toLowerCase()} sedang menunggu.
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm font-semibold text-[#667085]"
                >
                  Tiada fail sepadan dengan carian atau penapis tarikh.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="h-14.5">
                  <td className="px-6 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={[
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded",
                          getDraftTone(row) === "green"
                            ? "bg-[#EAF8EF] text-green"
                            : "bg-[#FFF0F0] text-red",
                        ].join(" ")}
                      >
                        <Icon
                          icon={getDraftIcon(row)}
                          size={16}
                          filled
                          weight={600}
                        />
                      </span>
                      <span className="truncate font-extrabold text-[#172033]">
                        {row.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-[#3B465A]">
                    {row.uploadedBy}
                  </td>
                  <td className="px-5 py-4 font-medium text-[#3B465A]">
                    {formatDraftDateTime(row.uploadedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-5">
                      <button
                        type="button"
                        className="text-dark-blue transition hover:text-[#2D367D]"
                        title="Lihat"
                        onClick={() => onContinueDraft(row)}
                      >
                        <Icon icon="visibility" size={18} weight={600} />
                      </button>
                      <button
                        type="button"
                        className="text-red transition hover:text-[#8F1111]"
                        title="Padam"
                        onClick={() => onDeleteDraft(row.id)}
                      >
                        <Icon icon="delete" size={18} weight={600} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

