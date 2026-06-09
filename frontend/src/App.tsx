import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import BugsPage from "./pages/BugsPage";
import BugDetailPage from "./pages/BugDetailPage";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import DepartmentDetailPage from "./pages/DepartmentDetailPage";
import TicketsPage from "./pages/TicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import AdminLogsPage from "./pages/AdminLogsPage";
import RolesPage from "./pages/RolesPage";
import FeaturesPage from "./pages/FeaturesPage";
import FeatureDetailPage from "./pages/FeatureDetailPage";
import SprintsPage from "./pages/SprintsPage";
import SprintDetailPage from "./pages/SprintDetailPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="features" element={<FeaturesPage />} />
        <Route path="features/:id" element={<FeatureDetailPage />} />
        <Route path="sprints" element={<SprintsPage />} />
        <Route path="sprints/:id" element={<SprintDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/:id" element={<TaskDetailPage />} />
        <Route path="bugs" element={<BugsPage />} />
        <Route path="bugs/:id" element={<BugDetailPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="admin/logs" element={<AdminLogsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="departments/:id" element={<DepartmentDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
