"use client";

import { useEffect, useState } from "react";

type SearchingDataOverlayProps = {
  message?: string;
  isFixed?: boolean;
  showElapsedTime?: boolean;
};

export default function SearchingDataOverlay({
  message = "Loading...",
  isFixed = false,
  showElapsedTime = false,
}: SearchingDataOverlayProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!showElapsedTime) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showElapsedTime]);

  return (
    <div
      className={`${isFixed ? "fixed" : "absolute"} inset-0 z-9999 flex items-center justify-center bg-blur-background p-4 backdrop-blur-sm`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex min-w-56 flex-col items-center gap-3 rounded-lg border border-static-white/15 bg-static-dark/35 px-7 py-6 shadow-2xl">
        <div className="relative grid h-12 w-12 place-items-center" aria-hidden="true">
          <div className="absolute inset-0 animate-ping rounded-full border border-static-white/20" />
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-static-white/20 border-t-static-white" />
        </div>
        <p className="text-center text-xs font-bold uppercase text-static-white">
          {message}
        </p>
        {showElapsedTime ? (
          <div className="flex items-center gap-2 border-t border-static-white/15 pt-3 text-static-white/80">
            <span className="text-[10px] font-semibold uppercase">
              Masa berlalu
            </span>
            <time
              className="min-w-11 font-mono text-sm font-extrabold tabular-nums text-static-white"
              dateTime={`PT${elapsedSeconds}S`}
            >
              {formatElapsedTime(elapsedSeconds)}
            </time>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteSecond = [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  return hours > 0 ? `${String(hours).padStart(2, "0")}:${minuteSecond}` : minuteSecond;
}
