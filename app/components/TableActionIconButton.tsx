import type { ComponentPropsWithoutRef } from "react";

import Icon from "@/app/components/Icon/Icon";

export type TableActionTone = "neutral" | "success" | "danger" | "warning";

const TONE_CLASSES: Record<TableActionTone, string> = {
  neutral:
    "text-action-neutral hover:bg-action-hover-neutral hover:text-action-accent",
  success: "text-green hover:bg-success-surface",
  danger: "text-red hover:bg-danger-surface",
  warning: "text-warning hover:bg-warning-surface",
};

export const TABLE_ACTION_ICON_BUTTON_BASE_CLASS =
  "inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-[color,background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-accent/45 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:active:scale-100";

export function getTableActionIconButtonClass(
  tone: TableActionTone = "neutral",
) {
  return `${TABLE_ACTION_ICON_BUTTON_BASE_CLASS} ${TONE_CLASSES[tone]}`;
}

type TableActionIconButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "title" | "aria-label"
> & {
  icon: string;
  label: string;
  tone?: TableActionTone;
  iconClassName?: string;
};

export default function TableActionIconButton({
  icon,
  label,
  tone = "neutral",
  iconClassName,
  className,
  type = "button",
  ...props
}: TableActionIconButtonProps) {
  return (
    <button
      type={type}
      className={`${getTableActionIconButtonClass(tone)} ${className ?? ""}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon icon={icon} size={18} className={iconClassName} />
    </button>
  );
}
