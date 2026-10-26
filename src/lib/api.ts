import type { Session } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function messageFrom(body: unknown): string {
  if (!body || typeof body !== "object") return "Não foi possível concluir a operação.";
  const data = body as Record<string, unknown>;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map(String).join(" ");
  const parts: string[] = [];
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) parts.push(value.map(String).join(" "));
    else if (typeof value === "string") parts.push(value);
    else if (value && typeof value === "object") parts.push(messageFrom(value));
  }
  return parts.filter(Boolean).join(" ") || "Não foi possível concluir a operação.";
}

async function parse(response: Response) {
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function refreshToken() {
  const refresh = localStorage.getItem("studio_refresh");
  if (!refresh) return false;
  const response = await fetch(`${API_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    localStorage.removeItem("studio_access");
    localStorage.removeItem("studio_refresh");
    return false;
  }
  const data = await response.json();
  localStorage.setItem("studio_access", data.access);
  if (data.refresh) localStorage.setItem("studio_refresh", data.refresh);
  return true;
}

export async function api<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = localStorage.getItem("studio_access");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401 && auth) {
    const refreshed = await refreshToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${localStorage.getItem("studio_access")}`);
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }
  const body = await parse(response);
  if (!response.ok) throw new ApiError(messageFrom(body), response.status);
  return body as T;
}

export async function apiBlob(path: string) {
  const headers = new Headers();
  const token = localStorage.getItem("studio_access");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    const body = await parse(response);
    throw new ApiError(messageFrom(body), response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  return { blob, filename: match?.[1] || "relatorio" };
}

export async function loginRequest(username: string, password: string) {
  const data = await api<{ access: string; refresh: string; user: Session["user"] }>(
    "/api/auth/token/",
    { method: "POST", body: JSON.stringify({ username, password }) },
    false,
  );
  localStorage.setItem("studio_access", data.access);
  localStorage.setItem("studio_refresh", data.refresh);
  return data;
}
