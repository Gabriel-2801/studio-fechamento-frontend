"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, loginRequest } from "./api";
import type { Meta, Session } from "./types";

type AuthState = {
  ready: boolean;
  session: Session | null;
  meta: Meta | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);

  async function load() {
    const nextSession = await api<Session>("/api/auth/me/");
    const nextMeta = await api<Meta>("/api/meta/");
    setSession(nextSession);
    setMeta(nextMeta);
  }

  useEffect(() => {
    if (!localStorage.getItem("studio_access")) {
      setReady(true);
      return;
    }
    load()
      .catch(() => {
        localStorage.removeItem("studio_access");
        localStorage.removeItem("studio_refresh");
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      meta,
      async login(username, password) {
        await loginRequest(username, password);
        await load();
      },
      logout() {
        localStorage.removeItem("studio_access");
        localStorage.removeItem("studio_refresh");
        setSession(null);
      },
      refreshSession: load,
    }),
    [ready, session, meta],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider ausente");
  return context;
}
