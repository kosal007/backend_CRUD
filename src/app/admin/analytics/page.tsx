"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "@/components/admin/AdminShell";
import {
  getAttendanceHistory,
  getStores,
  type AttendanceSession,
  type Store,
} from "@/lib/adminApi";

function hours(ms: number): number {
  return ms / 3_600_000;
}

function getWeekStart(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export default function AdminAnalyticsPage() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [storeRows, sessionRows] = await Promise.all([
          getStores(token),
          getAttendanceHistory(token),
        ]);

        if (canceled) {
          return;
        }

        setStores(storeRows);
        setSessions(sessionRows);
      } catch (err) {
        if (!canceled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics data.");
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

  const storeMap = useMemo(() => {
    return new Map(stores.map((store) => [store.id, store.name]));
  }, [stores]);

  const analytics = useMemo(() => {
    const byUser = new Map<string, { duration: number; sessions: number }>();
    const byStore = new Map<string, number>();

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const weekStart = getWeekStart(now);

    let dailySessions = 0;
    let dailyDuration = 0;
    let weeklySessions = 0;
    let weeklyDuration = 0;

    for (const session of sessions) {
      const duration = session.totalDuration ?? 0;

      const userItem = byUser.get(session.userId) ?? { duration: 0, sessions: 0 };
      userItem.duration += duration;
      userItem.sessions += 1;
      byUser.set(session.userId, userItem);

      byStore.set(session.storeId, (byStore.get(session.storeId) ?? 0) + 1);

      const checkInTime = new Date(session.checkInTime).getTime();
      if (!Number.isNaN(checkInTime)) {
        if (checkInTime >= dayStart.getTime()) {
          dailySessions += 1;
          dailyDuration += duration;
        }

        if (checkInTime >= weekStart.getTime()) {
          weeklySessions += 1;
          weeklyDuration += duration;
        }
      }
    }

    const userRows = Array.from(byUser.entries())
      .map(([userId, value]) => ({
        userId,
        totalHours: hours(value.duration),
        sessions: value.sessions,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    const storeRows = Array.from(byStore.entries())
      .map(([storeId, count]) => ({
        storeId,
        storeName: storeMap.get(storeId) ?? storeId,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      dailySessions,
      dailyHours: hours(dailyDuration),
      weeklySessions,
      weeklyHours: hours(weeklyDuration),
      userRows,
      storeRows,
    };
  }, [sessions, storeMap]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Analytics</h2>
        <p className="mt-1 text-base text-slate-600">Working-time summary across users and stores.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-base text-red-700">{error}</div>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Daily Sessions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analytics.dailySessions}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Daily Hours</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analytics.dailyHours.toFixed(2)}h</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Weekly Sessions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analytics.weeklySessions}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Weekly Hours</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{analytics.weeklyHours.toFixed(2)}h</p>
        </article>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-base font-semibold text-slate-900">Total Working Hours per User</h3>

          {loading ? <p className="mt-3 text-base text-slate-500">Loading...</p> : null}

          {!loading && analytics.userRows.length === 0 ? (
            <p className="mt-3 text-base text-slate-500">No attendance data.</p>
          ) : null}

          {!loading && analytics.userRows.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-base lg:text-xl">
                <thead>
                  <tr className="border-b border-slate-200 text-sm uppercase text-slate-500">
                    <th className="py-3 pr-5">User ID</th>
                    <th className="py-3 pr-5">Hours</th>
                    <th className="py-3">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.userRows.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-5 font-mono text-sm text-slate-700">{row.userId}</td>
                      <td className="py-3 pr-5 text-slate-700">{row.totalHours.toFixed(2)}h</td>
                      <td className="py-3 text-slate-700">{row.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-base font-semibold text-slate-900">Total Sessions per Store</h3>

          {loading ? <p className="mt-3 text-base text-slate-500">Loading...</p> : null}

          {!loading && analytics.storeRows.length === 0 ? (
            <p className="mt-3 text-base text-slate-500">No store session data.</p>
          ) : null}

          {!loading && analytics.storeRows.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-base lg:text-xl">
                <thead>
                  <tr className="border-b border-slate-200 text-sm uppercase text-slate-500">
                    <th className="py-3 pr-5">Store</th>
                    <th className="py-3">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.storeRows.map((row) => (
                    <tr key={row.storeId} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-5 text-slate-700">{row.storeName}</td>
                      <td className="py-3 text-slate-700">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
