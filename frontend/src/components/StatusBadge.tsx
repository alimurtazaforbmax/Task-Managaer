const colors: Record<string, string> = {
  backlog: "bg-slate-200 text-slate-700",
  todo: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  in_review: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-500",
  open: "bg-red-100 text-red-800",
  triaged: "bg-orange-100 text-orange-800",
  fixed: "bg-teal-100 text-teal-800",
  qa_verification: "bg-indigo-100 text-indigo-800",
  closed: "bg-green-100 text-green-800",
  rejected: "bg-rose-100 text-rose-800",
  active: "bg-emerald-100 text-emerald-800",
  on_hold: "bg-amber-100 text-amber-800",
  archived: "bg-slate-200 text-slate-600",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = colors[status] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
