type SearchingDataOverlayProps = {
  message?: string;
  isFixed?: boolean;
};

export default function SearchingDataOverlay({
  message = "Loading...",
  isFixed = false,
}: SearchingDataOverlayProps) {
  return (
    <div className={`${isFixed ? "fixed" : "absolute"} inset-0 z-9999 flex items-center justify-center backdrop-blur-sm bg-blur-background`}>
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"
          aria-hidden="true"
        />
        <p className="text-xs font-bold tracking-widest text-white uppercase">
          {message}
        </p>
      </div>
    </div>
  );
}
