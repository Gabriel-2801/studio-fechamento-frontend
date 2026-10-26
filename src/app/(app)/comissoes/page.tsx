"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, Empty, Field, PageHeader, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brl, monthStart, todayIso } from "@/lib/format";

type Statement = { collaborator_id: number; collaborator_name: string; procedure_count: number; billed: string; generated: string; paid: string; pending: string };

export default function CommissionsPage() {
  const { session } = useAuth();
  const admin = session?.user.role === "admin";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [older, setOlder] = useState(true);
  const [rows, setRows] = useState<Statement[]>([]);
  const [error, setError] = useState("");

  function load(start = from, end = to, includeOlder = older) {
    if (!start || !end) return;
    const params = new URLSearchParams({ date_from: start, date_to: end });
    if (includeOlder) params.set("include_older_pending", "true");
    api<Statement[]>(`/api/commission-statements/?${params.toString()}`).then(setRows).catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar."));
  }
  useEffect(() => {
    const start = monthStart();
    const end = todayIso();
    setFrom(start);
    setTo(end);
    load(start, end, older);
  }, [older]);

  function href(id: number) {
    const params = new URLSearchParams({ from, to });
    if (older) params.set("older", "1");
    return `/comissoes/${id}?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader eyebrow="A pagar" title={admin ? "Comissões" : "Minhas comissões"} description="A comissão gerada não é paga automaticamente. O pagamento é um registro separado, feito no detalhe da colaboradora." />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="De"><TextInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="Até"><TextInput type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
          <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={older} onChange={(event) => setOlder(event.target.checked)} /> Incluir pendências anteriores</label>
          <Button className="self-end" type="button" onClick={() => load()}>Atualizar</Button>
        </div>
      </Card>
      {error ? <p className="mb-3 text-sm text-accent">{error}</p> : null}
      {rows.length === 0 ? <Empty>Nenhuma comissão no período.</Empty> : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Colaboradora</th>
                <th>Procedimentos</th>
                <th>Faturamento</th>
                <th>Gerada</th>
                <th>Paga</th>
                <th>Pendente</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.collaborator_id} className="border-t border-line">
                  <td className="px-4 py-3"><Link href={href(row.collaborator_id)} className="font-medium hover:text-accent">{row.collaborator_name}</Link></td>
                  <td>{row.procedure_count}</td>
                  <td>{brl(row.billed)}</td>
                  <td>{brl(row.generated)}</td>
                  <td>{brl(row.paid)}</td>
                  <td>{brl(row.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
