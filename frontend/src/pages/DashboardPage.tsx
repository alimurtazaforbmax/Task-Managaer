import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import type { ApiResponse, DashboardStats, Notification, Paginated } from "../types";

export default function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>("/dashboard/");
      return unwrap(res);
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Notification>>>(
        "/notifications/?page_size=5"
      );
      const data = unwrap(res);
      return data.results ?? (data as unknown as Notification[]);
    },
  });

  const cards = [
    { label: "My open tasks", value: stats?.my_open_tasks ?? 0, to: "/tasks" },
    { label: "My open bugs", value: stats?.my_open_bugs ?? 0, to: "/bugs" },
    { label: "Open bugs (projects)", value: stats?.project_open_bugs ?? 0, to: "/bugs" },
    { label: "Overdue tasks", value: stats?.overdue_tasks ?? 0, to: "/tasks" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-slate-500 mt-1">Overview of your work</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white rounded-xl border p-6 hover:shadow-md transition"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-3xl font-bold text-brand-600 mt-2">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10 bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-lg">Recent notifications</h2>
        {!notifications?.length ? (
          <p className="text-slate-400 mt-4 text-sm">No notifications yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`p-3 rounded-lg border ${n.is_read ? "bg-slate-50" : "bg-brand-50 border-brand-100"}`}
              >
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
