import { Link } from "react-router-dom";

interface BackLinkProps {
  readonly to: string;
  readonly label: string;
}

function ChevronLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export default function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-100"
    >
      <ChevronLeftIcon />
      {label}
    </Link>
  );
}
