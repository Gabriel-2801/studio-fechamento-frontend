"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Button, TextInput } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] border border-line bg-card p-8 shadow-card">
        <div className="flex justify-center">
          <Logo size={156} />
        </div>
        <h1 className="mt-5 text-center font-display text-3xl">Login</h1>
        <div className="mt-6 space-y-3">
          <TextInput aria-label="Usuária" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Usuária" autoComplete="username" />
          <TextInput aria-label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" autoComplete="current-password" />
        </div>
        {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
        <Button className="mt-5 w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</Button>
      </form>
    </main>
  );
}
