import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";
import type { TestCase } from "../types";

interface TestCaseCardProps {
  readonly testCase: TestCase;
}

export default function TestCaseCard({ testCase }: TestCaseCardProps) {
  const palette = getProjectPalette(testCase.project);

  return (
    <Link
      to={`/test-cases/${testCase.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${palette.gradient} opacity-80`} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-bold text-white shadow-sm ${palette.gradient}`}
          >
            {getProjectInitials(testCase.title)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg text-slate-900 truncate group-hover:text-brand-700">
              {testCase.title}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {testCase.project_name}
              {testCase.feature_title ? ` · ${testCase.feature_title}` : ""}
            </p>
          </div>
          <StatusBadge status={testCase.status} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-teal-50 text-teal-700 px-2 py-0.5 font-medium capitalize">
            {testCase.test_type?.replace(/_/g, " ") ?? "functional"}
          </span>
          <span className="rounded-full bg-violet-50 text-violet-700 px-2 py-0.5 font-medium capitalize">
            {testCase.priority}
          </span>
        </div>
      </div>
    </Link>
  );
}
