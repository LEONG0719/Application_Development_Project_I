"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { commonIcons } from "@/app/components/Icon/Icon";
import ToolbarButton from "@/app/components/ToolbarIconButton";

import type { BayaranHistoryRecord } from "./types";

type HistoryFilter = {
  startDate: string;
  endDate: string;
  receiptNo: string;
  minAmount: string;
  maxAmount: string;
};

const emptyFilter: HistoryFilter = {
  startDate: "",
  endDate: "",
  receiptNo: "",
  minAmount: "",
  maxAmount: "",
};

export function useBayaranHistoryFilter(records: BayaranHistoryRecord[]) {
  const [filter, setFilter] = useState<HistoryFilter>(emptyFilter);
  const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const activeFilterCount = countActiveFilters(filter);
  const isFilterActive = activeFilterCount > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        filterRef.current?.contains(target) ||
        (target instanceof Element && target.closest("[data-filter-date-calendar]"))
      ) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const filteredRecords = isFilterActive
    ? records.filter((record) => {
        const paymentDate = getDateInput(record.paymentDate);
        const minAmount = parseAmountFilter(filter.minAmount);
        const maxAmount = parseAmountFilter(filter.maxAmount);
        const receiptQuery = normalizeSearchValue(filter.receiptNo);

        if ((filter.startDate || filter.endDate) && !paymentDate) {
          return false;
        }

        if (filter.startDate && paymentDate < filter.startDate) {
          return false;
        }

        if (filter.endDate && paymentDate > filter.endDate) {
          return false;
        }

        if (
          receiptQuery &&
          !normalizeSearchValue(record.receiptNo).includes(receiptQuery)
        ) {
          return false;
        }

        if (minAmount !== null && record.amount < minAmount) {
          return false;
        }

        if (maxAmount !== null && record.amount > maxAmount) {
          return false;
        }

        return true;
      })
    : records;

  const FilterButton = (
    <div ref={filterRef} className="relative">
      <ToolbarButton
        icon={commonIcons.filter}
        label="Tapis sejarah pembayaran"
        isActive={isOpen || isFilterActive}
        activeBadge={isFilterActive ? activeFilterCount : undefined}
        onClick={() => setIsOpen((value) => !value)}
      />
      {isOpen ? (
        <HistoryFilterPanel
          filter={filter}
          onChange={setFilter}
          onClear={() => setFilter(emptyFilter)}
        />
      ) : null}
    </div>
  );

  return {
    filteredRecords,
    isFilterActive,
    FilterButton,
  };
}

function HistoryFilterPanel({
  filter,
  onChange,
  onClear,
}: {
  filter: HistoryFilter;
  onChange: (value: HistoryFilter) => void;
  onClear: () => void;
}) {
  const hasValue = countActiveFilters(filter) > 0;

  function updateFilter(key: keyof HistoryFilter, value: string) {
    onChange({
      ...filter,
      [key]: value,
    });
  }

  return (
    <div
      className="absolute right-0 top-full z-20 mt-2 w-118 max-w-[90vw] rounded-2xl border border-light-grey/20 bg-white p-3 shadow-lg"
      role="group"
      aria-label="Tapis sejarah pembayaran"
    >
      <div className="px-2 pt-2">
        <p className="text-xs font-extrabold uppercase text-grey">
          Tapis Sejarah
        </p>
        <p className="mt-1 whitespace-nowrap text-sm text-grey">
          Tapis mengikut tarikh, no. resit atau amaun
        </p>
      </div>

      <hr className="my-3 border-t border-light-grey/20" />

      <div className="grid grid-cols-2 gap-3">
        <FilterField label="Tarikh Mula">
          <input
            type="date"
            value={filter.startDate}
            max={filter.endDate || undefined}
            onChange={(event) => updateFilter("startDate", event.target.value)}
            className="h-10 w-full rounded-xl border border-light-grey/25 bg-white px-3 text-sm font-semibold text-dark-grey outline-none transition-colors hover:border-dark-blue/30 focus:border-dark-blue"
          />
        </FilterField>
        <FilterField label="Tarikh Akhir">
          <input
            type="date"
            value={filter.endDate}
            min={filter.startDate || undefined}
            onChange={(event) => updateFilter("endDate", event.target.value)}
            className="h-10 w-full rounded-xl border border-light-grey/25 bg-white px-3 text-sm font-semibold text-dark-grey outline-none transition-colors hover:border-dark-blue/30 focus:border-dark-blue"
          />
        </FilterField>
        <FilterField label="No. Resit">
          <input
            type="text"
            value={filter.receiptNo}
            placeholder="Cari no. resit"
            onChange={(event) => updateFilter("receiptNo", event.target.value)}
            className="h-10 w-full rounded-xl border border-light-grey/25 bg-white px-3 text-sm font-semibold text-dark-grey outline-none transition-colors placeholder:text-light-grey hover:border-dark-blue/30 focus:border-dark-blue"
          />
        </FilterField>
        <div className="grid grid-cols-2 gap-2">
          <FilterField label="Amaun Min">
            <input
              type="number"
              min="0"
              step="0.01"
              value={filter.minAmount}
              placeholder="0.00"
              onChange={(event) => updateFilter("minAmount", event.target.value)}
              className="h-10 w-full rounded-xl border border-light-grey/25 bg-white px-3 text-sm font-semibold text-dark-grey outline-none transition-colors placeholder:text-light-grey hover:border-dark-blue/30 focus:border-dark-blue"
            />
          </FilterField>
          <FilterField label="Amaun Max">
            <input
              type="number"
              min="0"
              step="0.01"
              value={filter.maxAmount}
              placeholder="0.00"
              onChange={(event) => updateFilter("maxAmount", event.target.value)}
              className="h-10 w-full rounded-xl border border-light-grey/25 bg-white px-3 text-sm font-semibold text-dark-grey outline-none transition-colors placeholder:text-light-grey hover:border-dark-blue/30 focus:border-dark-blue"
            />
          </FilterField>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={!hasValue}
          onClick={onClear}
          className="inline-flex h-9 items-center rounded-lg border border-light-grey/25 px-4 text-xs font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-30"
        >
          Kosongkan
        </button>
      </div>
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-grey">
        {label}
      </span>
      {children}
    </label>
  );
}

function countActiveFilters(filter: HistoryFilter) {
  return [
    filter.startDate,
    filter.endDate,
    filter.receiptNo.trim(),
    filter.minAmount,
    filter.maxAmount,
  ].filter(Boolean).length;
}

function normalizeSearchValue(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseAmountFilter(value: string) {
  if (!value.trim()) {
    return null;
  }

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : null;
}

function getDateInput(value: string) {
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  if (isoDate) {
    return isoDate;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
