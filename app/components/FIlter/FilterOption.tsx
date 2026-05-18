"use client";

import Icon from "@/app/components/Icon/Icon";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  /** Optional Tailwind bg-* color class for the dot, e.g. "bg-green" or "bg-red-400". */
  dotColor?: string;
};

type FilterProps<T extends string> = {
  title: string;
  description: string;
  ariaLabel: string;
  /** Label for the built-in "select all" option. Defaults to "Semua". */
  defaultLabel?: string;
  options: FilterOption<T>[];
  /** Array of selected option values. When length equals options.length, Semua is considered active. */
  selectedValues: T[];
  onSelect: (values: T[]) => void;
};

export default function FilterOption<T extends string>({
  title,
  description,
  ariaLabel,
  defaultLabel = "Semua",
  options,
  selectedValues,
  onSelect,
}: FilterProps<T>) {
  const isAllSelected = selectedValues.length === options.length;

  function handleToggle(value: T) {
    const next = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelect(next);
  }

  return (
    <div
      className="absolute right-0 top-full flex flex-col gap-2 z-20 mt-2 rounded-2xl border border-light-grey/20 bg-white p-2 shadow-lg"
      role="listbox"
      aria-multiselectable="true"
      aria-label={ariaLabel}
    >
      <div className="px-2 pt-2">
        <p className="text-xs font-extrabold uppercase text-grey">{title}</p>
        <p className="mt-1 text-sm text-grey whitespace-nowrap">{description}</p>
      </div>

      <hr className="border-t border-light-grey/20" />

      <div className="flex flex-col gap-2">
        <button
          type="button"
          role="option"
          aria-selected={isAllSelected}
          className={`flex min-h-10 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-bold transition-colors ${
            isAllSelected
              ? "border-dark-blue bg-dark-blue text-white"
              : "border-light-grey/40 text-dark-grey hover:bg-light-blue"
          }`}
          onClick={() =>
            isAllSelected
              ? onSelect([])
              : onSelect(options.map((opt) => opt.value))
          }
        >
          <span className="truncate items-center justify-center text-center w-full">{defaultLabel}</span>
        </button>

        <hr className="border-t border-light-grey/20" />

        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);

            return (
                <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    isSelected
                    ? "bg-dark-blue text-white"
                    : "text-dark-grey hover:bg-light-blue"
                }`}
                onClick={() => handleToggle(option.value)}
                >
                <span className="flex min-w-0 items-center gap-2">
                    {option.dotColor ? (
                    <span
                        className={`size-2 shrink-0 rounded-full ${option.dotColor}`}
                    />
                    ) : null}
                    <span className="truncate">{option.label}</span>
                </span>
                {isSelected ? <Icon icon="done" size={16} /> : null}
                </button>
            );
            })}
        </div>
        </div>
    </div>
  );
}