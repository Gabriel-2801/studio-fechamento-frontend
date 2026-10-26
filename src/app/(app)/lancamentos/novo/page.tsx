"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewEntryPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/lancamentos?criar=1"); }, [router]);
  return <p className="text-sm text-muted">Abrindo o lançamento…</p>;
}
