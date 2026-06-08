import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError("Invalid credentials. Try admin / admin123");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-700 to-slate-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-slate-900">Task Manager</h1>
        <p className="text-slate-500 mt-1 mb-6">Sign in to your workspace</p>
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded">{error}</p>
        )}
        <label className="block text-sm font-medium text-slate-700">Username</label>
        <input
          className="mt-1 mb-4 w-full border rounded-lg px-3 py-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label className="block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          className="mt-1 mb-6 w-full border rounded-lg px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Demo: admin/admin123, dev/demo123, qa/demo123
        </p>
      </form>
    </div>
  );
}
