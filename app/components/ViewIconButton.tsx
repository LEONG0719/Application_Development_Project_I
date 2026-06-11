import type { ComponentPropsWithoutRef } from "react";

import { commonIcons } from "@/app/components/Icon/Icon";
import TableActionIconButton, {
  getTableActionIconButtonClass,
} from "@/app/components/TableActionIconButton";

export const VIEW_ICON_BUTTON_CLASS = getTableActionIconButtonClass("neutral");

type ViewIconButtonProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "title" | "aria-label"
> & {
  label: string;
};

export default function ViewIconButton({
  label,
  className,
  type = "button",
  ...props
}: ViewIconButtonProps) {
  return (
    <TableActionIconButton
      type={type}
      icon={commonIcons.eye}
      label={label}
      className={className}
      {...props}
    />
  );
}
