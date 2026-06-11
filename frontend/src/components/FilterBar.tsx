import type { ReactNode } from "react";
import SearchInput from "./SearchInput";

interface FilterBarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly searchPlaceholder?: string;
  readonly onClear?: () => void;
  readonly showClear?: boolean;
  readonly children?: ReactNode;
}

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  onClear,
  showClear = false,
  children,
}: FilterBarProps) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="lg:max-w-sm lg:flex-1"
        />
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-sm font-medium text-slate-600 hover:text-brand-700"
          >
            Clear filters
          </button>
        )}
      </div>
      {children && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {children}
        </div>
      )}
    </div>
  );
}

interface FilterSelectProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly { value: string; label: string }[];
}

export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function formatFilterLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
