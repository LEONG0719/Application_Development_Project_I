"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Calender from "@/app/components/Calender/Calender";
import Icon from "@/app/components/Icon/Icon";

type FilterDateValue = {
  startDate: string;
  endDate: string;
};

type FilterDateProps = {
  title: string;
  description: string;
  ariaLabel: string;
  value: FilterDateValue;
  onApply: (value: FilterDateValue) => void;
  onClear: () => void;
};

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function calcCalendarPos(buttonRef: React.RefObject<HTMLButtonElement | null>) {
  if (!buttonRef.current) return { top: 0, left: 0 };
  const rect = buttonRef.current.getBoundingClientRect();
  const pickerWidth = 320;
  const gap = 8;
  const left = Math.min(
    Math.max(12, rect.left),
    window.innerWidth - pickerWidth - 12,
  );
  return { top: rect.bottom + gap, left };
}

export default function FilterDate({
  title,
  description,
  ariaLabel,
  value,
  onApply,
  onClear,
}: FilterDateProps) {
  const [draft, setDraft] = useState<FilterDateValue>(value);
  const [openField, setOpenField] = useState<"start" | "end" | null>(null);
  const [calendarPos, setCalendarPos] = useState({ top: 0, left: 0 });
  const hasValue = Boolean(draft.startDate || draft.endDate);

  const startButtonRef = useRef<HTMLButtonElement>(null);
  const endButtonRef = useRef<HTMLButtonElement>(null);
  const startContainerRef = useRef<HTMLDivElement>(null);
  const endContainerRef = useRef<HTMLDivElement>(null);

  // Recalculate floating calendar position on open and on resize / scroll.
  useEffect(() => {
    if (!openField) return;

    const buttonRef = openField === "start" ? startButtonRef : endButtonRef;

    function updatePos() {
      setCalendarPos(calcCalendarPos(buttonRef));
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [openField]);

  const activeContainerRef =
    openField === "start" ? startContainerRef : endContainerRef;

  const calendarPortal =
    openField && typeof document !== "undefined"
      ? createPortal(
          <div
            data-filter-date-calendar
            className="fixed z-9999 rounded-3xl border border-light-grey/20 bg-white shadow-[0_18px_45px_rgba(13,47,86,0.16)]"
            style={{
              top: `${calendarPos.top}px`,
              left: `${calendarPos.left}px`,
              width: "300px",
            }}
            role="dialog"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <Calender
              containerRef={activeContainerRef}
              scale={0.85}
              isOpen={true}
              value={openField === "start" ? draft.startDate : draft.endDate}
              maxDate={openField === "start" ? (draft.endDate || undefined) : undefined}
              minDate={openField === "end" ? (draft.startDate || undefined) : undefined}
              disableAbsolutePositioning={true}
              onChange={(val) => {
                const next =
                  openField === "start"
                    ? { ...draft, startDate: val }
                    : { ...draft, endDate: val };
                setDraft(next);
                onApply(next);
                setOpenField(null);
              }}
              onClose={() => setOpenField(null)}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className="absolute right-0 top-full z-20 mt-2 w-118 max-w-[90vw] flex flex-col gap-2 rounded-2xl border border-light-grey/20 bg-white p-3 shadow-lg"
      role="group"
      aria-label={ariaLabel}
    >
      <div className="px-2 pt-2">
        <p className="text-xs font-extrabold uppercase text-grey">{title}</p>
        <p className="mt-1 text-sm text-grey whitespace-nowrap">{description}</p>
      </div>

      <hr className="border-t border-light-grey/20" />

      <div className="grid grid-cols-5 gap-3">
        {/* Start Date */}
        <div className="col-span-2 flex flex-col gap-1" ref={startContainerRef}>
          <button
            ref={startButtonRef}
            type="button"
            className={`flex min-h-10 w-full items-center gap-2 rounded-2xl border bg-white py-2 pl-3 pr-3 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors ${
              openField === "start"
                ? "border-dark-blue text-dark-blue"
                : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
            }`}
            aria-expanded={openField === "start"}
            aria-haspopup="dialog"
            onClick={() => setOpenField(openField === "start" ? null : "start")}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
              <Icon icon="calendar_month" size={16} />
            </span>
            <span className={`flex items-center justify-center w-full truncate ${draft.startDate ? "" : "text-grey"}`}>
              {draft.startDate ? formatDateLabel(draft.startDate) : "Tarikh Bermula"}
            </span>
          </button>
        </div>

        {/* End Date */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="relative flex-1" ref={endContainerRef}>
            <button
              ref={endButtonRef}
              type="button"
              className={`flex min-h-10 w-full items-center gap-2 rounded-2xl border bg-white py-2 pl-3 pr-3 text-left text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_10px_rgba(15,23,42,0.04)] outline-none transition-colors ${
                openField === "end"
                  ? "border-dark-blue text-dark-blue"
                  : "border-light-grey/25 text-dark-grey hover:border-dark-blue/30"
              }`}
              aria-expanded={openField === "end"}
              aria-haspopup="dialog"
              onClick={() => setOpenField(openField === "end" ? null : "end")}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-xl bg-light-blue text-dark-blue">
                <Icon icon="calendar_month" size={16} />
              </span>
              <span className={`flex items-center justify-center w-full truncate ${draft.endDate ? "" : "text-grey"}`}>
                {draft.endDate ? formatDateLabel(draft.endDate) : "Tarikh Akhir"}
              </span>
            </button>
          </div>
        </div>

        {/* Clear Button */}
        <div className="flex items-center">
          <button
            type="button"
            disabled={!hasValue}
            className="inline-flex h-min w-full items-center justify-center rounded-lg border border-light-grey/25 px-4 py-2 text-xs font-semibold text-grey transition-colors hover:border-dark-blue hover:text-dark-blue disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => {
              const emptyValue = { startDate: "", endDate: "" };
              setDraft(emptyValue);
              onClear();
            }}
          >
            Kosongkan
          </button>
        </div>
      </div>

      {calendarPortal}
    </div>
  );
}