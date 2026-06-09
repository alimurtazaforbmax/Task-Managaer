import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import WorkItemRow from "../components/WorkItemRow";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import type { ApiResponse, DashboardStats } from "../types";

function StatCard({
  label,
  value,
  to,
  accent,
  valueClass = "text-slate-800",
  labelClass,
}: {
  label: string;
  value: number;
  to: string;
  accent: string;
  valueClass?: string;
  labelClass?: string;
}) {
  return (
    <Link
      to={to}
      className={`bg-white rounded-xl border border-slate-200 border-l-4 ${accent} p-5 shadow-sm hover:shadow-md transition`}
    >
      <p className={`text-sm ${labelClass ?? "text-slate-500"}`}>{label}</p>
      <p className={`text-3xl font-bold mt-2 ${valueClass}`}>{value}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const permissions = usePermissions();

  const { data: stats } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>("/dashboard/");
      return unwrap(res);
    },
  });

  const greetingName =
    stats?.greeting_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "there";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const primaryCards = [
    {
      label: "My open tasks",
      value: stats?.my_open_tasks ?? 0,
      to: "/tasks",
      accent: "border-l-brand-500",
      valueClass: "text-brand-600",
    },
    {
      label: "My open bugs",
      value: stats?.my_open_bugs ?? 0,
      to: "/bugs",
      accent: "border-l-slate-500",
      valueClass: "text-slate-800",
    },
    {
      label: "Due this week",
      value: stats?.due_soon_tasks ?? 0,
      to: "/tasks",
      accent: "border-l-amber-500",
      valueClass: "text-amber-600",
    },
    {
      label: "Overdue tasks",
      value: stats?.overdue_tasks ?? 0,
      to: "/tasks",
      accent: "border-l-rose-500",
      valueClass: "text-rose-600",
      labelClass: stats?.overdue_tasks ? "text-rose-600" : undefined,
    },
  ];

  const secondaryCards = [
    {
      label: "My projects",
      value: stats?.my_projects_count ?? 0,
      to: "/projects",
      accent: "border-l-indigo-500",
      show: true,
    },
    {
      label: "Active sprints",
      value: stats?.active_sprints ?? 0,
      to: "/sprints",
      accent: "border-l-violet-500",
      show: true,
    },
    {
      label: "Active features",
      value: stats?.active_features ?? 0,
      to: "/features",
      accent: "border-l-emerald-500",
      show: true,
    },
    {
      label: "Open bugs (projects)",
      value: stats?.project_open_bugs ?? 0,
      to: "/bugs",
      accent: "border-l-slate-400",
      show: true,
    },
    {
      label: "Pending tickets",
      value: stats?.pending_tickets ?? 0,
      to: "/tickets",
      accent: "border-l-orange-500",
      valueClass: "text-orange-600",
      show: permissions.can_approve_tickets || stats?.can_approve_tickets,
    },
    {
      label: "My features",
      value: stats?.my_owned_features ?? 0,
      to: "/features",
      accent: "border-l-teal-500",
      show: (stats?.my_owned_features ?? 0) > 0,
    },
  ].filter((c) => c.show);

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {greetingName}
        </h1>
        <p className="text-slate-500 mt-1">
          {user?.access_role_name ?? user?.department_name
            ? [user?.access_role_name, user?.department_name].filter(Boolean).join(" · ")
            : "Your work at a glance"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {primaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {secondaryCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {secondaryCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              to={card.to}
              accent={card.accent}
              valueClass={card.valueClass}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-slate-900">Upcoming deadlines</h2>
            <Link to="/tasks" className="text-sm text-brand-600 hover:underline">
              All tasks
            </Link>
          </div>
          {!stats?.upcoming_tasks?.length ? (
            <p className="text-sm text-slate-400">No upcoming due dates on your tasks.</p>
          ) : (
            <ul className="space-y-2">
              {stats.upcoming_tasks.map((t) => (
                <WorkItemRow
                  key={t.id}
                  title={t.title}
                  subtitle={[t.project_name, t.due_date ? `Due ${t.due_date}` : ""].filter(Boolean).join(" · ")}
                  status={t.status}
                  priority={t.priority}
                  to={`/tasks/${t.id}`}
                  accentColor="bg-brand-500"
                  type="task"
                />
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-slate-900">Recently updated</h2>
            <Link to="/tasks" className="text-sm text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {!stats?.recent_tasks?.length ? (
            <p className="text-sm text-slate-400">No assigned tasks yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recent_tasks.map((t) => (
                <WorkItemRow
                  key={t.id}
                  title={t.title}
                  subtitle={[t.project_name, t.status].join(" · ")}
                  status={t.status}
                  priority={t.priority}
                  to={`/tasks/${t.id}`}
                  accentColor="bg-sky-500"
                  type="task"
                />
              ))}
            </ul>
          )}
        </section>

        {(stats?.active_sprints_list?.length ?? 0) > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-slate-900">Active sprints</h2>
              <Link to="/sprints" className="text-sm text-brand-600 hover:underline">
                All sprints
              </Link>
            </div>
            <ul className="space-y-3">
              {stats?.active_sprints_list?.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/sprints/${s.id}`}
                    className="block rounded-lg border border-slate-200 p-3 hover:border-brand-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{s.project_name}</p>
                    {s.end_date && (
                      <p className="text-xs text-slate-400 mt-1">Ends {s.end_date}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(stats?.my_features?.length ?? 0) > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-slate-900">My features</h2>
              <Link to="/features" className="text-sm text-brand-600 hover:underline">
                All features
              </Link>
            </div>
            <ul className="space-y-3">
              {stats?.my_features?.map((f) => (
                <li key={f.id}>
                  <Link
                    to={`/features/${f.id}`}
                    className="block rounded-lg border border-slate-200 p-3 hover:border-brand-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{f.title}</p>
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{f.project_name}</p>
                    {f.target_date && (
                      <p className="text-xs text-slate-400 mt-1">Target {f.target_date}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(stats?.recent_bugs?.length ?? 0) > 0 && (
          <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-slate-900">My open bugs</h2>
              <Link to="/bugs" className="text-sm text-brand-600 hover:underline">
                All bugs
              </Link>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.recent_bugs.map((b) => (
                <WorkItemRow
                  key={b.id}
                  title={b.title}
                  subtitle={[b.project_name, b.severity].join(" · ")}
                  status={b.status}
                  priority={b.priority}
                  to={`/bugs/${b.id}`}
                  accentColor="bg-amber-500"
                  type="bug"
                />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
