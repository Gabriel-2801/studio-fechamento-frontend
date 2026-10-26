"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, PageHeader, Select, TextInput } from "@/components/ui";
import { api, apiBlob } from "@/lib/api";
import { brl, monthStart, todayIso } from "@/lib/format";
import type { Collaborator, PeriodSummary, Procedure } from "@/lib/types";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ date_from: "", date_to: "", collaborator: "", procedure: "", payment_status: "" });
  const [report, setReport] = useState<PeriodSummary | null>(null);
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  function load(next = filters) {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => { if (value) params.set(key, value); });
    api<PeriodSummary>(`/api/reports/period/?${params.toString()}`).then(setReport).catch(() => setReport(null));
  }
  useEffect(() => {
    const next = { date_from: monthStart(), date_to: todayIso(), collaborator: "", procedure: "", payment_status: "" };
    setFilters(next); load(next);
    api<Collaborator[]>("/api/collaborators/").then(setPeople).catch(() => undefined);
    api<Procedure[]>("/api/procedures/").then(setProcedures).catch(() => undefined);
  }, []);

  async function download() {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const file = await apiBlob(`/api/reports/entries.csv?${params.toString()}`);
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = file.filename; anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader eyebrow="Consulta" title="Relatórios" description="Recorte livre por período, colaboradora, procedimento e recebimento. A exportação analítica não substitui o fechamento mensal." actions={<Button type="button" onClick={download}>Exportar CSV</Button>} />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Field label="De"><TextInput type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} /></Field>
          <Field label="Até"><TextInput type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} /></Field>
          <Field label="Colaboradora"><Select value={filters.collaborator} onChange={(event) => setFilters({ ...filters, collaborator: event.target.value })}><option value="">Todas</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</Select></Field>
          <Field label="Procedimento"><Select value={filters.procedure} onChange={(event) => setFilters({ ...filters, procedure: event.target.value })}><option value="">Todos</option>{procedures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Button className="self-end" type="button" onClick={() => load()}>Filtrar</Button>
        </div>
      </Card>
      {report ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><h2 className="font-medium">Faturamento</h2><p className="mt-2 text-sm">Após descontos {brl(report.net_amount)}</p><p className="text-sm">Recebido {brl(report.received_amount)} · pendente {brl(report.pending_amount)}</p><p className="text-sm">{report.procedure_count} procedimentos em {report.entry_count} lançamentos</p></Card>
          <Card><h2 className="font-medium">Comissões e resultado</h2><p className="mt-2 text-sm">Geradas {brl(report.commission_generated)} · devidas {brl(report.commission_recognized)} · pendentes {brl(report.commission_pending)}</p><p className="mt-2 text-sm">Resultado estimado: {report.estimated_result === null ? "indisponível neste filtro" : brl(report.estimated_result)}</p><p className="mt-2 text-xs text-muted">{report.result_explanation}</p></Card>
          <Card><h2 className="mb-2 font-medium">Colaboradoras</h2>{report.by_collaborator.map((row) => <p key={row.collaborator_id} className="flex justify-between text-sm"><span>{row.name}</span><span>{brl(row.net)}</span></p>)}</Card>
          <Card><h2 className="mb-2 font-medium">Procedimentos</h2>{report.top_procedures.map((row) => <p key={row.procedure_id} className="flex justify-between text-sm"><span>{row.name}</span><span>{row.quantity}</span></p>)}</Card>
        </div>
      ) : null}
    </div>
  );
}
