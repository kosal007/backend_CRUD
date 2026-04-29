"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "@/components/admin/AdminShell";
import { getAttendanceCurrent, getAttendanceHistory, getStores, type AttendanceSession, type Store } from "@/lib/adminApi";

function durationToHours(totalDurationMs: number): string {
  return (totalDurationMs / 3_600_000).toFixed(2);
}

export default function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [storesData, activeData, completedData] = await Promise.all([
          getStores(token),
          getAttendanceCurrent(token),
          getAttendanceHistory(token),
        ]);

        if (canceled) {
          return;
        }

        setStores(storesData);
        setActiveSessions(activeData);
        setCompletedSessions(completedData);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      canceled = true;
    };
  }, [token]);

  const stats = useMemo(() => {
    const activeStores = stores.filter((store) => store.status === "active").length;
    const totalHours = completedSessions.reduce((sum, session) => sum + (session.totalDuration ?? 0), 0);

    return {
      totalStores: stores.length,
      activeStores,
      activeSessions: activeSessions.length,
      totalHours: durationToHours(totalHours),
    };
  }, [stores, activeSessions, completedSessions]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-base text-slate-600">Admin overview for geofences and attendance activities.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-base text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Stores</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalStores}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Active Stores</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.activeStores}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Active Sessions</p>
          <p className="mt-2 text-3xl font-bold text-indigo-700">{stats.activeSessions}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total Working Hours</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalHours}h</p>
        </article>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Active Sessions</h3>
            <span className="text-sm text-slate-500">Live monitoring</span>
          </div>

          {loading ? <p className="text-base text-slate-500">Loading...</p> : null}

          {!loading && activeSessions.length === 0 ? (
            <p className="text-base text-slate-500">No active sessions right now.</p>
          ) : null}

          {!loading && activeSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-base lg:text-xl">
                <thead>
                  <tr className="border-b border-slate-200 text-sm uppercase text-slate-500">
                    <th className="py-3 pr-5">User</th>
                    <th className="py-3 pr-5">Store</th>
                    <th className="py-3">Check In</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.slice(0, 8).map((session) => (
                    <tr key={session.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-5 font-mono text-sm text-slate-700">{session.userId}</td>
                      <td className="py-3 pr-5 font-mono text-sm text-slate-700">{session.storeId}</td>
                      <td className="py-3 text-slate-700">
                        {new Date(session.checkInTime).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Recent Completed Sessions</h3>
            <span className="text-sm text-slate-500">Latest checkout records</span>
          </div>

          {loading ? <p className="text-base text-slate-500">Loading...</p> : null}

          {!loading && completedSessions.length === 0 ? (
            <p className="text-base text-slate-500">No completed sessions available.</p>
          ) : null}

          {!loading && completedSessions.length > 0 ? (
            <div className="space-y-2">
              {completedSessions.slice(0, 8).map((session) => (
                <div key={session.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm text-slate-500">User</p>
                  <p className="font-mono text-sm text-slate-700">{session.userId}</p>
                  <p className="mt-2 text-sm text-slate-500">Duration</p>
                  <p className="text-base font-semibold text-slate-900">
                    {durationToHours(session.totalDuration ?? 0)} hours
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
