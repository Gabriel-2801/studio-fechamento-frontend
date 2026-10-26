"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryForm } from "@/components/entry-form";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { Entry } from "@/lib/types";

export default function EditEntryPage() {
  const params = useParams<{ id: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => {
    api<Entry>(`/api/entries/${params.id}/`).then(setEntry).catch(() => setEntry(null));
  }, [params.id]);
  return (
    <div>
      <PageHeader eyebrow="Correção" title="Corrigir lançamento" description="Se o dia ou o mês estiver fechado, reabra o período com justificativa. Comissão já paga precisa ser estornada antes de mudar os itens." />
      {entry ? <EntryForm initial={entry} /> : <p className="text-sm text-muted">Carregando…</p>}
    </div>
  );
}
