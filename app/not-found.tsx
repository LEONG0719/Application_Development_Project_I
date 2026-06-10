import Link from "next/link";
import { ROUTES } from "./constants/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-content-muted">
        404
      </p>
      <h1 className="text-3xl font-bold text-content">Page not found</h1>
      <p className="max-w-md text-sm text-content-muted">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href={ROUTES.lamanUtama}
        className="rounded-md bg-dark-blue px-4 py-2 text-sm font-semibold text-static-white transition-opacity hover:opacity-90"
      >
        Go back home
      </Link>
    </div>
  );
}
