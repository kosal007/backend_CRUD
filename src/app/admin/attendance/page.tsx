"use client";

import { useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "@/components/admin/AdminShell";
import {
  getAttendanceCurrent,
  getAttendanceHistory,
  getStores,
  type AttendanceSession,
  type Store,
} from "@/lib/adminApi";

type Filters = {
  userId: string;
  storeId: string;
  fromDate: string;
  toDate: string;
};

const defaultFilters: Filters = {
  userId: "",
  storeId: "",
  fromDate: "",
  toDate: "",
};

function isInDateRange(value: string, fromDate: string, toDate: string): boolean {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) {
    return false;
  }

  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00`).getTime();
    if (time < from) {
      return false;
    }
  }

  if (toDate) {
    const to = new Date(`${toDate}T23:59:59`).getTime();
    if (time > to) {
      return false;
    }
  }

  return true;
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) {
    return "-";
  }

  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;

  return `${hours}h ${remainMinutes}m`;
}

export default function AdminAttendancePage() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [activeRows, setActiveRows] = useState<AttendanceSession[]>([]);
  const [historyRows, setHistoryRows] = useState<AttendanceSession[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const queryUser = filters.userId.trim() || undefined;
      const [storeList, currentList, historyList] = await Promise.all([
        getStores(token),
        getAttendanceCurrent(token, queryUser),
        getAttendanceHistory(token, queryUser),
      ]);

      setStores(storeList);
      setActiveRows(currentList);
      setHistoryRows(historyList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [token]);

  const filteredActive = useMemo(() => {
    return activeRows.filter((row) => {
      if (filters.storeId && row.storeId !== filters.storeId) {
        return false;
      }

      return isInDateRange(row.checkInTime, filters.fromDate, filters.toDate);
    });
  }, [activeRows, filters]);

  const filteredHistory = useMemo(() => {
    return historyRows.filter((row) => {
      if (filters.storeId && row.storeId !== filters.storeId) {
        return false;
      }

      return isInDateRange(row.checkInTime, filters.fromDate, filters.toDate);
    });
  }, [historyRows, filters]);

  const storeMap = useMemo(() => {
    return new Map(stores.map((store) => [store.id, store.name]));
  }, [stores]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Attendance Dashboard</h2>
        <p className="mt-1 text-base text-slate-600">
          Monitor active sessions and completed check-in/check-out records.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-base font-semibold text-slate-900">Filters</h3>

        <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            placeholder="User ID (optional)"
            value={filters.userId}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                userId: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
          />

          <select
            value={filters.storeId}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                storeId: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
          >
            <option value="">All stores</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.fromDate}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                fromDate: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
          />

          <input
            type="date"
            value={filters.toDate}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                toDate: event.target.value,
              }))
            }
            className="rounded-lg border border-slate-300 px-5 py-3 text-base outline-none ring-indigo-500 focus:ring-2"
          />

          <button
            onClick={() => void loadData()}
            className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-indigo-700"
          >
            Apply / Refresh
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-base text-red-700">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Active Sessions</h3>
          <span className="text-sm text-slate-500">{filteredActive.length} session(s)</span>
        </div>

        {loading ? <p className="text-base text-slate-500">Loading active sessions...</p> : null}

        {!loading && filteredActive.length === 0 ? (
          <p className="text-base text-slate-500">No active sessions found.</p>
        ) : null}

        {!loading && filteredActive.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-base lg:text-xl">
              <thead>
                <tr className="border-b border-slate-200 text-sm uppercase text-slate-500">
                  <th className="py-3 pr-5">User ID</th>
                  <th className="py-3 pr-5">Store</th>
                  <th className="py-3 pr-5">Check In</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredActive.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-5 font-mono text-sm text-slate-700">{row.userId}</td>
                    <td className="py-3 pr-5 text-slate-700">{storeMap.get(row.storeId) ?? row.storeId}</td>
                    <td className="py-3 pr-5 text-slate-700">{new Date(row.checkInTime).toLocaleString()}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-sm font-semibold text-emerald-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Completed Sessions</h3>
          <span className="text-sm text-slate-500">{filteredHistory.length} row(s)</span>
        </div>

        {loading ? <p className="text-base text-slate-500">Loading history...</p> : null}

        {!loading && filteredHistory.length === 0 ? (
          <p className="text-base text-slate-500">No history sessions found.</p>
        ) : null}

        {!loading && filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-base lg:text-xl">
              <thead>
                <tr className="border-b border-slate-200 text-sm uppercase text-slate-500">
                  <th className="py-3 pr-5">User ID</th>
                  <th className="py-3 pr-5">Store</th>
                  <th className="py-3 pr-5">Check In</th>
                  <th className="py-3 pr-5">Check Out</th>
                  <th className="py-3 pr-5">Total Duration</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-5 font-mono text-sm text-slate-700">{row.userId}</td>
                    <td className="py-3 pr-5 text-slate-700">{storeMap.get(row.storeId) ?? row.storeId}</td>
                    <td className="py-3 pr-5 text-slate-700">{new Date(row.checkInTime).toLocaleString()}</td>
                    <td className="py-3 pr-5 text-slate-700">
                      {row.checkOutTime ? new Date(row.checkOutTime).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 pr-5 text-slate-700">{formatDuration(row.totalDuration)}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-200 px-2 py-1 text-sm font-semibold text-slate-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
