"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/Icon/Icon";

export type GlobalMessageTone = "success" | "error" | "info" | "warning";

export type GlobalFixedNotice = {
  tone: GlobalMessageTone;
  message: string;
  title?: string;
};

type GlobalFixedMessageProps = {
  notice: GlobalFixedNotice | null;
  onDismiss?: () => void;
  autoDismissMs?: number | null;
};

// Toggle this to true to use the inspection notice for development and testing.
const MESSAGE_INSPECTION_MODE = false;
const MESSAGE_INSPECTION_NOTICE: GlobalFixedNotice = {
  tone: "success",
  title: "Success",
  message: "The list has been saved.",
};

const toneStyles: Record<
  GlobalMessageTone,
  {
    borderColor: string;
    backgroundColor: string;
    textColor: string;
    iconColor: string;
    dismissClass: string;
    icon: string;
    defaultTitle: string;
  }
> = {
  success: {
    borderColor: "border-green/30",
    backgroundColor: "bg-success-surface",
    textColor: "text-green",
    iconColor: "text-green",
    dismissClass: "text-green hover:bg-green/10",
    icon: "check_circle",
    defaultTitle: "Success",
  },
  warning: {
    borderColor: "border-warning/30",
    backgroundColor: "bg-warning-surface",
    textColor: "text-warning",
    iconColor: "text-warning",
    dismissClass: "text-warning hover:bg-warning/10",
    icon: "warning",
    defaultTitle: "Warning",
  },
  error: {
    borderColor: "border-red/30",
    backgroundColor: "bg-danger-surface",
    textColor: "text-red",
    iconColor: "text-red",
    dismissClass: "text-red hover:bg-red/10",
    icon: "error",
    defaultTitle: "Error",
  },
  info: {
    borderColor: "border-info/30",
    backgroundColor: "bg-info-surface",
    textColor: "text-info",
    iconColor: "text-info",
    dismissClass: "text-info hover:bg-info/10",
    icon: "info",
    defaultTitle: "Info",
  },
};

export default function GlobalFixedMessage({
  notice,
  onDismiss,
  autoDismissMs = 8000,
}: GlobalFixedMessageProps) {
  const activeNotice = MESSAGE_INSPECTION_MODE
    ? MESSAGE_INSPECTION_NOTICE
    : notice;
  const [hoveredNoticeKey, setHoveredNoticeKey] = useState<string | null>(null);
  const onDismissRef = useRef(onDismiss);
  const hasDismissHandler = Boolean(onDismiss);
  const hasActiveNotice = Boolean(activeNotice);
  const activeNoticeKey = activeNotice
    ? `${activeNotice.tone}|${activeNotice.title ?? ""}|${activeNotice.message}`
    : "";

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const isCurrentNoticeHovered = hoveredNoticeKey === activeNoticeKey;

  useEffect(() => {
    if (
      !hasActiveNotice ||
      !hasDismissHandler ||
      !autoDismissMs ||
      MESSAGE_INSPECTION_MODE ||
      isCurrentNoticeHovered
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current?.();
    }, autoDismissMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeNoticeKey,
    autoDismissMs,
    hasActiveNotice,
    hasDismissHandler,
    isCurrentNoticeHovered,
  ]);

  if (!activeNotice)
    return null;

  const tone = toneStyles[activeNotice.tone];
  const title = activeNotice.title?.trim() || tone.defaultTitle;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-150 flex max-h-[70vh] w-[calc(100%-2rem)] max-w-88 -translate-x-1/2 overflow-hidden rounded-lg border-l-6 shadow-lg ${tone.borderColor} ${tone.backgroundColor}`}
      role={activeNotice.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setHoveredNoticeKey(activeNoticeKey)}
      onMouseLeave={() => setHoveredNoticeKey(null)}
      onFocus={() => setHoveredNoticeKey(activeNoticeKey)}
      onBlur={() => setHoveredNoticeKey(null)}
    >
      <div className="flex min-h-0 min-w-0 flex-1 items-start gap-3 px-3 py-3">
        {/* Icon */}
        <span className="h-6 w-6 shrink-0 flex items-center justify-center">
          <Icon icon={tone.icon} size={18} className={tone.iconColor} />
        </span>

        {/* Message Content */}
        <div className="global-fixed-message-scroll max-h-[calc(70vh-1.5rem)] min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
          <p className={`text-[15px] font-semibold leading-5 ${tone.textColor}`}>
            {title}
          </p>
          <p className="whitespace-pre-wrap wrap-break-word text-[14px] text-content-muted">
            {activeNotice.message}
          </p>
        </div>

        {/* Dismiss Button */}
        {onDismiss && !MESSAGE_INSPECTION_MODE ? (
          <button
            type="button"
            className={`-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${tone.dismissClass}`}
            aria-label="Tutup mesej"
            onClick={onDismiss}
          >
            <Icon icon="close" size={18} weight={700} />
          </button>
        ) : null}
      </div>
      <style jsx>{`
        .global-fixed-message-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(80, 80, 80, 0.28) transparent;
        }

        .global-fixed-message-scroll::-webkit-scrollbar {
          width: 4px;
        }

        .global-fixed-message-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .global-fixed-message-scroll::-webkit-scrollbar-thumb {
          background: rgba(80, 80, 80, 0.24);
          border-radius: 999px;
        }

        .global-fixed-message-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(80, 80, 80, 0.36);
        }
      `}</style>
    </div>
  );
}
