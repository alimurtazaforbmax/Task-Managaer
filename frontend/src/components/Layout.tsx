import { Link, NavLink, Outlet } from "react-router-dom";
import SidebarUserPanel from "./SidebarUserPanel";
import ToastContainer from "./ToastContainer";
import TopBar from "./TopBar";
import { useAuth } from "../context/AuthContext";
import { formatRoleLabel } from "../utils/projectStyle";
import { useMarkNotificationFromUrl } from "../hooks/useMarkNotificationFromUrl";
import { useNotificationWatcher } from "../hooks/useNotificationWatcher";
import { usePushNotifications } from "../hooks/usePushNotifications";

const baseNav = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/features", label: "Features" },
  { to: "/sprints", label: "Sprints" },
  { to: "/tasks", label: "Tasks" },
  { to: "/bugs", label: "Bugs" },
  { to: "/tickets", label: "Tickets" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  usePushNotifications(!!user);
  useNotificationWatcher(!!user);
  useMarkNotificationFromUrl(!!user);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <ToastContainer />
      <aside className="w-full md:w-64 shrink-0 bg-slate-900 text-white flex flex-col md:min-h-screen">
        <div className="p-6 border-b border-slate-700">
          <Link to="/" className="text-xl font-bold tracking-tight">
            BetaFlow
          </Link>
          <p className="text-slate-500 text-xs mt-0.5">Task Manager</p>
          {user && (
            <p className="text-slate-400 text-sm mt-1">{formatRoleLabel(user.role)}</p>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1 hidden md:block">
          {[
            ...baseNav,
            ...(user?.role === "admin"
              ? [
                  { to: "/roles", label: "Roles" },
                  { to: "/departments", label: "Departments" },
                  { to: "/users", label: "Users" },
                  { to: "/admin/logs", label: "Logs" },
                ]
              : []),
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg transition ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && <div className="hidden md:block"><SidebarUserPanel user={user} onLogout={logout} /></div>}
      </aside>
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
          {[
            ...baseNav,
            ...(user?.role === "admin"
              ? [
                  { to: "/roles", label: "Roles" },
                  { to: "/departments", label: "Depts" },
                  { to: "/users", label: "Users" },
                  { to: "/admin/logs", label: "Logs" },
                ]
              : []),
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive ? "bg-brand-600 text-white" : "text-slate-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && <TopBar onLogout={logout} />}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
