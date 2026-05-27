"use client";

import { useState, useEffect, useRef, CSSProperties } from "react";
import { createPortal } from "react-dom";
import ToolbarIconButton from "@/app/components/ToolbarIconButton";
import FilterDate from "@/app/components/FIlter/FilterDate";
import { commonIcons } from "@/app/components/Icon/Icon";
import type { TransactionRecord } from "./PenghuniDetailHistory";

type DateFilter = { startDate: string; endDate: string };

type UsePenghuniDetailHistoryFilterResult = {
    filteredHistory: Array<TransactionRecord & { baki: number }>;
    isDateFilterActive: boolean;
    FilterButton: React.ReactNode;
};

export function usePenghuniDetailHistoryFilter(
    records: Array<TransactionRecord & { baki: number }>,
): UsePenghuniDetailHistoryFilterResult {
    const [dateFilter, setDateFilter] = useState<DateFilter>({ startDate: "", endDate: "" });
    const [isOpen, setIsOpen] = useState(false);
    const [anchorStyle, setAnchorStyle] = useState<CSSProperties>({});
    const buttonRef = useRef<HTMLDivElement>(null);

    // Close panel on outside click (button ref + portal panel both checked via data attr).
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Element | null;
            if (
                buttonRef.current &&
                !buttonRef.current.contains(target) &&
                !target?.closest("[data-filter-date-panel]")
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    function handleToggle() {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Anchor fixed div at the bottom-right of the button.
            // FilterDate's own `absolute right-0 top-full mt-2` will position relative to this zero-size div.
            setAnchorStyle({
                position: "fixed",
                top: rect.bottom,
                right: window.innerWidth - rect.right,
                zIndex: 9999,
            });
        }
        setIsOpen((prev) => !prev);
    }

    const isActive = Boolean(dateFilter.startDate || dateFilter.endDate);

    const filteredHistory = isActive
        ? records.filter((record) => {
              // Convert DD/MM/YYYY to YYYY-MM-DD for accurate string comparison
              const parts = record.tarikh.split("/");
              const formattedTarikh = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : record.tarikh;

              if (dateFilter.startDate && formattedTarikh < dateFilter.startDate) return false;
              if (dateFilter.endDate && formattedTarikh > dateFilter.endDate) return false;
              return true;
          })
        : records;

    const panel =
        isOpen && typeof document !== "undefined"
            ? createPortal(
                  <div style={anchorStyle} data-filter-date-panel>
                      <FilterDate
                          title="Tapis Tarikh"
                          description="Pilihan tarikh akan ditapis secara automatik"
                          ariaLabel="Tapis sejarah transaksi mengikut tarikh"
                          value={dateFilter}
                          onApply={(value) => {
                              setDateFilter(value);
                          }}
                          onClear={() => {
                              setDateFilter({ startDate: "", endDate: "" });
                          }}
                      />
                  </div>,
                  document.body,
              )
            : null;

    const FilterButton = (
        <>
            <div ref={buttonRef}>
                <ToolbarIconButton
                    icon={commonIcons.filter}
                    label="Tapis mengikut tarikh"
                    isActive={isActive}
                    onClick={handleToggle}
                />
            </div>
            {panel}
        </>
    );

    return { filteredHistory, isDateFilterActive: isActive, FilterButton };
}
