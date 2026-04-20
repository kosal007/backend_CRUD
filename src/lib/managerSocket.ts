"use client";

import { io, type Socket } from "socket.io-client";

type ClientToServerEvents = {
  "manager:join": (payload: { managerId: string }) => void;
};

type ServerToClientEvents = {
  "manager:location:update": (payload: unknown) => void;
};

let managerSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

function resolveSocketServerUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const port = process.env.NEXT_PUBLIC_SOCKET_PORT ?? "4000";

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    const host = window.location.hostname;
    return `${protocol}://${host}:${port}`;
  }

  return `http://localhost:${port}`;
}

export function getManagerSocketServerUrl(): string {
  return resolveSocketServerUrl();
}

export function getManagerSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (typeof window === "undefined") {
    throw new Error("getManagerSocket() can only be used in the browser.");
  }

  if (managerSocket) {
    return managerSocket;
  }

  managerSocket = io(getManagerSocketServerUrl(), {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
    transports: ["websocket", "polling"],
  });

  return managerSocket;
}
