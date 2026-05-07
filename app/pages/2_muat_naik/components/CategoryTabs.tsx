import Icon from "../../../components/Icon";
import { categories } from "./constants";
import type { Category } from "./types";

type CategoryTabsProps = {
  activeCategory: Category;
  disabled?: boolean;
  onCategoryChange: (category: Category) => void;
};

export default function CategoryTabs({
  activeCategory,
  disabled = false,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-3">
      <div className="grid h-12 w-full max-w-132.5 grid-cols-4 rounded-xl bg-light-blue p-1.5 shadow-[inset_0_0_0_1px_rgba(219,226,242,0.45)]">
        {categories.map((category) => {
          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(category)}
              disabled={disabled}
              className={[
                "rounded-lg text-xs font-extrabold transition-colors",
                isActive
                  ? "bg-white text-dark-blue shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
                  : "text-[#43506B] hover:bg-white/60 hover:text-dark-blue",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              {category}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DCE2F1] bg-white px-5 text-xs font-extrabold text-dark-blue shadow-sm transition hover:border-[#C8D2EA] hover:bg-[#FBFCFF]"
      >
        <Icon icon="download" size={17} weight={600} />
        Demo Document
      </button>
    </div>
  );
}
