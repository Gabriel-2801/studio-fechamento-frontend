"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, session } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);
  if (!ready || !session) return <div className="grid min-h-screen place-items-center text-sm text-muted">Carregando o caixa…</div>;
  return <Shell>{children}</Shell>;
}
