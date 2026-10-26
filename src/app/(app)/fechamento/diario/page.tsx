"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Banner, Button, Card, Field, Modal, PageHeader, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { CLOSING_STATUS, PAYMENT_STATUS, brDate, brl, todayIso } from "@/lib/format";
import type { PeriodSummary } from "@/lib/types";

type Closing = { id: number; status: string; closed_at: string | null; closed_by: string; reopen_reason: string; events: { type: string; at: string; by: string; reason?: string }[] } | null;

export default function DailyClosingPage() {
  const [date, setDate] = useState("");
  const [report, setReport] = useState<PeriodSummary | null>(null);
  const [closing, setClosing] = useState<Closing>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  function load(day = date) {
    if (!day) return;
    api<{ closing: Closing; report: PeriodSummary }>(`/api/daily-closings/preview/?date=${day}`).then((data) => { setReport(data.report); setClosing(data.closing); setError(""); }).catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar."));
  }
  useEffect(() => { const day = todayIso(); setDate(day); load(day); }, []);

  async function closeDay() {
    try {
      await api("/api/daily-closings/", { method: "POST", body: JSON.stringify({ reference_date: date }) });
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível fechar."); }
  }

  async function reopen() {
    if (!closing) return;
    try {
      await api(`/api/daily-closings/${closing.id}/reopen/`, { method: "POST", body: JSON.stringify({ reason }) });
      setOpen(false); setReason(""); load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível reabrir."); }
  }

  return (
    <div>
      <PageHeader eyebrow="Consolidação interna" title="Fechamento diário" description="Fecha os registros do dia. Não confirma saldo de banco nem dinheiro físico." actions={<Field label="Data"><TextInput type="date" value={date} onChange={(event) => { setDate(event.target.value); load(event.target.value); }} /></Field>} />
      <Banner>Este fechamento consolida lançamentos internos declarados. Ele não confirma PIX, cartão, transferência ou o caixa físico.</Banner>
      {error ? <p className="mb-3 text-sm text-accent">{error}</p> : null}
      {report ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone={closing?.status === "closed" ? "good" : "warn"}>{CLOSING_STATUS[closing?.status || report.closing_status || "open"]}</Badge>
            {closing?.status === "closed" ? <Button variant="danger" type="button" onClick={() => setOpen(true)}>Reabrir com justificativa</Button> : <Button type="button" onClick={closeDay}>Fechar o dia</Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Lançamentos" value={String(report.entry_count)} />
            <Info label="Procedimentos" value={String(report.procedure_count)} />
            <Info label="Bruto" value={brl(report.gross_amount)} />
            <Info label="Descontos" value={brl(report.discount_amount)} />
            <Info label="Após descontos" value={brl(report.net_amount)} />
            <Info label="Pendente de recebimento" value={brl(report.pending_amount)} />
            <Info label="Comissões geradas" value={brl(report.commission_generated)} />
            <Info label="Comissões pagas nesta data" value={brl(report.commission_payments?.total)} />
            <Info label="Despesas" value={brl(report.expenses_registered)} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card><h2 className="mb-2 font-medium">Por forma de pagamento</h2>{report.by_payment_method.map((row) => <p key={row.method} className="flex justify-between text-sm"><span>{row.label}</span><span>{brl(row.amount)}</span></p>)}{report.by_payment_method.length === 0 ? <p className="text-sm text-muted">Nenhum recebimento declarado.</p> : null}</Card>
            <Card>
              <h2 className="mb-2 font-medium">Avisos</h2>
              {(report.warnings || []).map((warning) => <p key={warning} className="text-sm text-amber-800">{warning}</p>)}
              {(report.hard_inconsistencies || []).map((item) => <p key={item} className="text-sm text-accent">{item}</p>)}
              {(report.warnings || []).length + (report.hard_inconsistencies || []).length === 0 ? <p className="text-sm text-muted">Nenhuma diferença encontrada.</p> : null}
            </Card>
          </div>
          <Card className="mt-4">
            <h2 className="mb-2 font-medium">Origem dos valores</h2>
            {(report.entries || []).map((entry) => <Link key={entry.id} href={`/lancamentos/${entry.id}`} className="flex flex-wrap justify-between gap-2 border-t border-line py-2 text-sm"><span>{brDate(entry.service_date)} · #{entry.id} · {entry.collaborators}</span><span>{brl(entry.final_amount)} · {PAYMENT_STATUS[entry.payment_status] || entry.payment_status}</span></Link>)}
            {(report.entries || []).length === 0 ? <p className="text-sm text-muted">Sem lançamentos neste dia.</p> : null}
          </Card>
          {closing?.events?.length ? <Card className="mt-4"><h2 className="mb-2 font-medium">Quem fechou e reabriu</h2>{closing.events.map((event, index) => <p key={index} className="text-sm">{event.type === "close" ? "Fechamento" : "Reabertura"} por {event.by}{event.reason ? ` — ${event.reason}` : ""}</p>)}</Card> : null}
        </>
      ) : null}
      {open ? <Modal title="Reabrir o dia" onClose={() => setOpen(false)}><Field label="Justificativa"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} /></Field><Button className="mt-3" type="button" onClick={reopen}>Reabrir</Button></Modal> : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <article className="rounded-3xl border border-line bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></article>;
}
