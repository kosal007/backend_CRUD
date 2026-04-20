"use client";

import { useEffect, useState } from "react";

import { getManagerSocket, getManagerSocketServerUrl } from "@/lib/managerSocket";

export default function ManagerSocketDebug() {
  const [status, setStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");
  const [socketId, setSocketId] = useState<string | null>(null);
  const [socketServerUrl, setSocketServerUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastDisconnectReason, setLastDisconnectReason] = useState<string | null>(null);

  useEffect(() => {
    const socket = getManagerSocket();
    const resolvedUrl = getManagerSocketServerUrl();
    setSocketServerUrl(resolvedUrl);

    const handleConnect = () => {
      setStatus("connected");
      setSocketId(socket.id ?? null);
      setLastError(null);
      console.log("✅ Role A connected:", socket.id);
      socket.emit("manager:join", { managerId: "manager-debug" });
    };

    const handleConnectError = (error: Error) => {
      setStatus("disconnected");
      setLastError(error.message);
      console.error("[Manager Socket] connect_error", {
        message: error.message,
        name: error.name,
      });
    };

    const handleDisconnect = (reason: string) => {
      setStatus("disconnected");
      setLastDisconnectReason(reason);
      console.warn("[Manager Socket] disconnect", { reason, socketId: socket.id });
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);

    if (!socket.connected) {
      setStatus("connecting");
      console.log("[Manager Socket] connecting", { url: resolvedUrl });
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  const statusClass =
    status === "connected"
      ? "bg-emerald-100 text-emerald-700"
      : status === "connecting"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-200 text-slate-700";

  return (
    <aside className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-md backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3">
        <strong className="text-slate-900">Manager Socket Debug</strong>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${statusClass}`}>{status}</span>
      </div>
      <p className="text-slate-600">
        <span className="font-medium text-slate-800">socket.id:</span> {socketId ?? "-"}
      </p>
      <p className="text-slate-600">
        <span className="font-medium text-slate-800">url:</span> {socketServerUrl ?? "-"}
      </p>
      {lastError ? (
        <p className="mt-1 text-rose-600">
          <span className="font-medium">connect_error:</span> {lastError}
        </p>
      ) : null}
      {lastDisconnectReason ? (
        <p className="mt-1 text-amber-700">
          <span className="font-medium">disconnect:</span> {lastDisconnectReason}
        </p>
      ) : null}
    </aside>
  );
}
