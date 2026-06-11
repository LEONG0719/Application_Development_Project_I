import type { ComponentPropsWithoutRef } from "react";

import Icon from "@/app/components/Icon/Icon";

type HeaderIconButtonTone = "neutral" | "danger";

const TONE_CLASSES: Record<HeaderIconButtonTone, string> = {
  neutral:
    "text-action-neutral hover:bg-action-hover-neutral hover:text-action-accent",
  danger: "text-red hover:bg-danger-surface",
};

const ACTIVE_CLASSES: Record<HeaderIconButtonTone, string> = {
  neutral: "bg-action-hover-neutral text-action-accent",
  danger: "bg-danger-surface text-red",
};

type HeaderIconButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "title" | "aria-label"
> & {
  icon: string;
  label: string;
  tone?: HeaderIconButtonTone;
  isActive?: boolean;
};

export default function HeaderIconButton({
  icon,
  label,
  tone = "neutral",
  isActive = false,
  className,
  type = "button",
  ...props
}: HeaderIconButtonProps) {
  return (
    <button
      type={type}
      className={`inline-grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent transition-[color,background-color,border-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-accent/45 active:scale-90 ${
        isActive ? ACTIVE_CLASSES[tone] : TONE_CLASSES[tone]
      } ${className ?? ""}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon icon={icon} size={22} />
    </button>
  );
}
