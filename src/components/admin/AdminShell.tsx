"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getMe, loginAdmin, type AuthUser } from "@/lib/adminApi";

type AdminAuthContextValue = {
  token: string;
  user: AuthUser;
  refreshMe: () => Promise<void>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminShell.");
  }

  return context;
}

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/stores", label: "Stores" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/analytics", label: "Analytics" },
];

function LoginView({ onLoggedIn }: { onLoggedIn: (token: string, user: AuthUser) => void }) {
  const [email, setEmail] = useState("manager.test.1775622641578@example.com");
  const [password, setPassword] = useState("Manager123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await loginAdmin(email.trim(), password);
      onLoggedIn(result.token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Admin Login</h1>
          <p className="mt-1 text-base text-slate-600">Sign in to open the geofencing dashboard.</p>

          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <label className="block text-base font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
                required
              />
            </label>

            <label className="block text-base font-medium text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
                required
              />
            </label>

            {error ? <p className="text-base text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-base font-medium text-slate-900">Need Product CRUD?</p>
          <p className="mt-1 text-sm text-slate-600">
            You can still open the product management page without admin login.
          </p>
          <Link
            href="/products"
            className="mt-3 inline-flex rounded-lg border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Open Product Page
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [initializing, setInitializing] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const refreshMe = async () => {
    if (!token) {
      return;
    }

    const me = await getMe(token);
    setUser(me);
  };

  useEffect(() => {
    const storedToken = window.localStorage.getItem("admin_token");
    if (!storedToken) {
      setInitializing(false);
      return;
    }

    setToken(storedToken);
    void getMe(storedToken)
      .then((me) => setUser(me))
      .catch(() => {
        window.localStorage.removeItem("admin_token");
        setToken(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  const logout = () => {
    window.localStorage.removeItem("admin_token");
    setToken(null);
    setUser(null);
  };

  const handleLoggedIn = (nextToken: string, nextUser: AuthUser) => {
    window.localStorage.setItem("admin_token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const contextValue = useMemo<AdminAuthContextValue | null>(() => {
    if (!token || !user) {
      return null;
    }

    return {
      token,
      user,
      refreshMe,
      logout,
    };
  }, [token, user]);

  if (initializing) {
    return <div className="p-6 text-base text-slate-600">Loading admin dashboard...</div>;
  }

  if (!token || !user) {
    return <LoginView onLoggedIn={handleLoggedIn} />;
  }

  if (user.role !== "ROLE_A") {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-base text-red-700">
          This dashboard is restricted to admin users only.
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-slate-200 bg-white p-6 lg:border-b-0 lg:border-r">
            <h1 className="mb-6 text-3xl font-bold text-indigo-700">Geofence Admin</h1>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-5 py-3 text-base font-medium transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="flex min-h-screen flex-col">
            <header className="flex flex-wrap items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-4 sm:px-6">
              <div>
                <p className="text-base font-medium text-slate-900">{user.name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>

              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 px-5 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Logout
              </button>
            </header>

            <main className="flex-1 p-6 sm:p-6">{children}</main>
          </div>
        </div>
      </div>
    </AdminAuthContext.Provider>
  );
}
