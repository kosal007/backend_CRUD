export type ApiErrorShape = {
  error?: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ROLE_A" | "ROLE_B";
  createdAt: string | null;
};

export type Store = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

export type AttendanceSession = {
  id: string;
  userId: string;
  storeId: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: "active" | "completed";
  totalDuration: number | null;
  createdAt: string;
  updatedAt: string;
};

function toApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "Request failed.";
  }

  const message = (payload as ApiErrorShape).error;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return "Request failed.";
}

async function requestJson<T>(
  path: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string;
    body?: unknown;
  }
): Promise<T> {
  const response = await fetch(path, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(toApiErrorMessage(data));
  }

  return data as T;
}

export async function loginAdmin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const payload = await requestJson<{ data: { token: string; user: AuthUser } }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

  return payload.data;
}

export async function getMe(token: string): Promise<AuthUser> {
  const payload = await requestJson<{ data: AuthUser }>("/api/auth/me", {
    token,
  });

  return payload.data;
}

export async function getStores(token: string): Promise<Store[]> {
  const payload = await requestJson<{ data: Store[] }>("/api/stores", { token });
  return payload.data;
}

export async function createStore(
  token: string,
  body: Pick<Store, "name" | "latitude" | "longitude" | "radius"> & { status?: "active" | "inactive" }
): Promise<Store> {
  const payload = await requestJson<{ data: Store }>("/api/stores", {
    method: "POST",
    token,
    body,
  });

  return payload.data;
}

export async function updateStore(
  token: string,
  id: string,
  body: Partial<Pick<Store, "name" | "latitude" | "longitude" | "radius" | "status">>
): Promise<Store> {
  const payload = await requestJson<{ data: Store }>(`/api/stores/${id}`, {
    method: "PUT",
    token,
    body,
  });

  return payload.data;
}

export async function deactivateStore(token: string, id: string): Promise<void> {
  await requestJson<{ data: { id: string } }>(`/api/stores/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function getAttendanceHistory(token: string, userId?: string): Promise<AttendanceSession[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const payload = await requestJson<{ data: AttendanceSession[] }>(`/api/attendance/history${query}`, {
    token,
  });

  return payload.data;
}

export async function getAttendanceCurrent(token: string, userId?: string): Promise<AttendanceSession[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  const payload = await requestJson<{ data: AttendanceSession | AttendanceSession[] | null }>(
    `/api/attendance/current${query}`,
    { token }
  );

  if (!payload.data) {
    return [];
  }

  return Array.isArray(payload.data) ? payload.data : [payload.data];
}
