"use client";

import { useEffect, useRef } from "react";
import GlobalFixedMessage from "@/app/components/Message/GlobalFixedMessage";

import type { KuartersNotice } from "./kuartersHelpers";

type KuartersFeedbackBannerProps = {
  notice: KuartersNotice | null;
  onDismiss: () => void;
};

export default function KuartersFeedbackBanner({
  notice,
  onDismiss,
}: KuartersFeedbackBannerProps) {
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismissRef.current();
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  return (
    <GlobalFixedMessage
      notice={notice}
      onDismiss={onDismiss}
    />
  );
}
