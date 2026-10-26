"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Banner, Button, Card, Field, Modal, PageHeader, TextArea } from "@/components/ui";
import { ApiError, api, apiBlob } from "@/lib/api";
import { brDate, brl } from "@/lib/format";
import type { PeriodSummary } from "@/lib/types";

type Closing = { id: number; status: string; closed_by: string; reopen_reason: string } | null;

export default function MonthlyClosingPage() {
  const [month, setMonth] = useState("");
  const [report, setReport] = useState<PeriodSummary | null>(null);
  const [closing, setClosing] = useState<Closing>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  function load(value = month) {
    const [year, monthNumber] = value.split("-");
    api<{ closing: Closing; report: PeriodSummary }>(`/api/reports/month/?year=${year}&month=${Number(monthNumber)}`).then((data) => { setReport(data.report); setClosing(data.closing); setError(""); }).catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar."));
  }
  useEffect(() => {
    const now = new Date();
    const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setMonth(value);
    load(value);
  }, []);

  async function closeMonth() {
    const [year, monthNumber] = month.split("-");
    try { await api("/api/monthly-closings/", { method: "POST", body: JSON.stringify({ year: Number(year), month: Number(monthNumber) }) }); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível fechar."); }
  }
  async function reopen() {
    if (!closing) return;
    try { await api(`/api/monthly-closings/${closing.id}/reopen/`, { method: "POST", body: JSON.stringify({ reason }) }); setOpen(false); load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível reabrir."); }
  }
  async function download(extension: string) {
    const [year, monthNumber] = month.split("-");
    const file = await apiBlob(`/api/reports/month/export/${extension}/?year=${year}&month=${Number(monthNumber)}`);
    const url = URL.createObjectURL(file.blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = file.filename; anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader eyebrow={report?.document_status === "fechado" ? "Mês fechado" : "Prévia"} title="Fechamento mensal" description="Três blocos: faturamento, comissões e resultado gerencial estimado." actions={<input className="rounded-2xl border border-line bg-white px-3 py-2 text-sm" type="month" value={month} onChange={(event) => { setMonth(event.target.value); load(event.target.value); }} />} />
      <Banner>{report?.disclaimer} O resultado não é lucro contábil nem saldo bancário.</Banner>
      {error ? <p className="mb-3 text-sm text-accent">{error}</p> : null}
      {report ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone={report.document_status === "fechado" ? "good" : "warn"}>{report.document_status === "fechado" ? "Fechado" : "Prévia"}</Badge>
            {closing?.status === "closed" ? <Button variant="danger" type="button" onClick={() => setOpen(true)}>Reabrir</Button> : <Button type="button" onClick={closeMonth}>Fechar o mês</Button>}
            <Button variant="secondary" type="button" onClick={() => download("pdf")}>PDF</Button>
            <Button variant="secondary" type="button" onClick={() => download("csv")}>CSV</Button>
            <Button variant="secondary" type="button" onClick={() => download("xlsx")}>Excel</Button>
          </div>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card>
              <h2 className="font-display text-2xl">A. Faturamento</h2>
              <Line label="Bruto" value={brl(report.gross_amount)} />
              <Line label="Descontos" value={brl(report.discount_amount)} />
              <Line label="Após descontos" value={brl(report.net_amount)} />
              <Line label="Recebido" value={brl(report.received_amount)} />
              <Line label="Pendente" value={brl(report.pending_amount)} />
              <Line label="Procedimentos" value={String(report.procedure_count)} />
              {report.by_payment_method.map((row) => <Line key={row.method} label={row.label} value={brl(row.amount)} />)}
            </Card>
            <Card>
              <h2 className="font-display text-2xl">B. Comissões</h2>
              <p className="mt-2 text-xs leading-5 text-muted">{report.policy_note}</p>
              {report.by_collaborator.map((row) => <div key={row.collaborator_id} className="mt-3 border-t border-line pt-2 text-sm"><p className="font-medium">{row.name}</p><p>Gerada {brl(row.generated)} · devida {brl(row.recognized)} · paga {brl(row.paid)} · pendente {brl(row.pending)}</p></div>)}
              <Line label="Pagamentos feitos no mês" value={brl(report.commission_payments?.total)} />
              {(report.adjustments || []).slice(0, 5).map((item) => <p key={item.id} className="mt-2 text-xs text-muted">{item.kind_label}: {item.reason}</p>)}
            </Card>
            <Card>
              <h2 className="font-display text-2xl">C. Resultado</h2>
              <p className="mt-2 text-xs leading-5 text-muted">{report.formula}</p>
              <Line label="Faturamento após descontos" value={brl(report.net_amount)} />
              <Line label="Comissões reconhecidas" value={brl(report.commission_recognized)} />
              <Line label="Despesas registradas" value={brl(report.expenses_registered)} />
              <Line label="Despesas ainda pendentes" value={brl(report.expenses_pending)} />
              <p className="mt-4 font-display text-3xl">{brl(report.estimated_result)}</p>
              <p className="text-xs text-muted">{report.result_explanation}</p>
            </Card>
          </section>
          <Card className="mt-4">
            <h2 className="mb-2 font-medium">Lançamentos que formam o total</h2>
            {(report.entries || []).map((entry) => <Link className="block border-t border-line py-2 text-sm" key={entry.id} href={`/lancamentos/${entry.id}`}>{brDate(entry.service_date)} · #{entry.id} · {entry.collaborators} · {brl(entry.final_amount)}</Link>)}
          </Card>
        </>
      ) : null}
      {open ? <Modal title="Reabrir o mês" onClose={() => setOpen(false)}><Field label="Justificativa"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} /></Field><Button className="mt-3" type="button" onClick={reopen}>Reabrir</Button></Modal> : null}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <p className="mt-2 flex justify-between gap-3 text-sm"><span className="text-muted">{label}</span><span>{value}</span></p>;
}
