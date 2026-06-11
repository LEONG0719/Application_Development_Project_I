type TransactionStatusBadgeProps = {
  status?: string | null;
  className?: string;
};

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  NORMAL: {
    label: "Normal",
    classes:
      "border-status-normal-border bg-status-normal-surface text-status-normal-text before:bg-status-normal-dot",
  },
  DIBALIKAN: {
    label: "Dibalikkan",
    classes:
      "border-status-reversed-border bg-status-reversed-surface text-status-reversed-text before:bg-status-reversed-dot",
  },
  DILARASKAN: {
    label: "Dilaraskan",
    classes:
      "border-status-adjusted-border bg-status-adjusted-surface text-status-adjusted-text before:bg-status-adjusted-dot",
  },
  PEMBALIKAN: {
    label: "Pembalikan",
    classes:
      "border-status-reversal-border bg-status-reversal-surface text-status-reversal-text before:bg-status-reversal-dot",
  },
  PELARASAN: {
    label: "Pelarasan",
    classes:
      "border-status-adjustment-border bg-status-adjustment-surface text-status-adjustment-text before:bg-status-adjustment-dot",
  },
};

const BASE_CLASS =
  "inline-flex min-h-6 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-[10px] font-bold uppercase leading-none before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full";

export default function TransactionStatusBadge({
  status,
  className,
}: TransactionStatusBadgeProps) {
  const normalizedStatus = status?.trim().toUpperCase() || "N/A";
  const config = STATUS_CONFIG[normalizedStatus];

  return (
    <span
      className={`${BASE_CLASS} ${
        config?.classes ??
        "border-status-default-border bg-status-default-surface text-status-default-text before:bg-status-default-dot"
      } ${className ?? ""}`}
    >
      {config?.label ?? normalizedStatus}
    </span>
  );
}
