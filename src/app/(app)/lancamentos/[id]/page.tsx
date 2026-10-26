"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Banner, Button, Card, Field, PageHeader, TextArea } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { COMMISSION_STATUS, PAYMENT_STATUS, brDate, brDateTime, brl, pct } from "@/lib/format";
import type { Entry } from "@/lib/types";

export default function EntryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const canEdit = session?.user.role === "admin" || session?.user.role === "operator";

  function load() {
    api<Entry>(`/api/entries/${params.id}/`).then(setEntry).catch((err) => setError(err instanceof ApiError ? err.message : "Lançamento não encontrado."));
  }
  useEffect(load, [params.id]);

  async function cancel() {
    setError("");
    try {
      await api(`/api/entries/${params.id}/cancel/`, { method: "POST", body: JSON.stringify({ reason }) });
      load();
      setReason("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível cancelar.");
    }
  }

  if (!entry) return <p className="text-sm text-muted">{error || "Carregando lançamento…"}</p>;
  return (
    <div>
      <PageHeader
        eyebrow={brDate(entry.service_date)}
        title={`Lançamento #${entry.id}`}
        description={entry.redacted ? "Você está vendo somente os seus procedimentos deste atendimento." : "Valores copiados no momento do registro. Alterar o catálogo não muda este lançamento."}
        actions={canEdit && entry.status === "active" && !entry.redacted ? <Link href={`/lancamentos/${entry.id}/editar`}><Button variant="secondary">Corrigir</Button></Link> : undefined}
      />
      {entry.status === "cancelled" ? <Banner>Cancelado: {entry.cancellation_reason}</Banner> : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {entry.payment_status ? <Badge tone={entry.payment_status === "paid" ? "good" : "warn"}>{PAYMENT_STATUS[entry.payment_status]}</Badge> : null}
        <Badge>Total {brl(entry.final_amount)}</Badge>
        <Badge>Comissão {brl(entry.commission_generated)}</Badge>
        <Badge tone="good">Studio {brl(entry.studio_amount)}</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Procedimentos</h2>
          <div className="space-y-3">
            {entry.items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-line p-3 text-sm">
                <p className="font-medium">{item.quantity}× {item.procedure_name}</p>
                <p className="text-muted">{item.collaborator_name}</p>
                <p className="mt-2">Tabela {brl(item.catalog_unit_price)} · final {brl(item.final_amount)} · desconto {brl(item.discount_amount)}</p>
                <p>Comissão {pct(item.commission_percent)} · {item.commission_rule_label}</p>
                <p>Gerada {brl(item.commission_generated)} · devida {brl(item.commission_recognized)} · paga {brl(item.commission_paid)} · pendente {brl(item.commission_pending)}</p>
                <Badge tone={item.commission_status === "paid" ? "good" : item.commission_status === "reversed" ? "bad" : "warn"}>{COMMISSION_STATUS[item.commission_status]}{item.commission_adjusted ? " · ajustada" : ""}</Badge>
                {item.justification ? <p className="mt-2 text-muted">Justificativa: {item.justification}</p> : null}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Pagamentos declarados</h2>
          {entry.payments.length === 0 ? <p className="text-sm text-muted">Nenhum recebimento registrado. Isso não entra como dinheiro recebido.</p> : entry.payments.map((payment) => (
            <p key={payment.id} className="flex justify-between border-b border-line py-2 text-sm"><span>{payment.method_label}{payment.notes ? ` · ${payment.notes}` : ""}</span><span>{brl(payment.amount)}</span></p>
          ))}
          {entry.notes ? <p className="mt-3 text-sm text-muted">{entry.notes}</p> : null}
        </Card>
      </div>
      {entry.audit ? (
        <Card className="mt-4">
          <h2 className="mb-3 font-medium">Histórico</h2>
          <ul className="space-y-2 text-sm">{entry.audit.map((log) => <li key={log.id}><span className="text-muted">{brDateTime(log.created_at)} · {log.user}</span> — {log.description}</li>)}</ul>
        </Card>
      ) : null}
      {canEdit && entry.status === "active" && !entry.redacted ? (
        <Card className="mt-4">
          <Field label="Cancelar lançamento" hint="O registro permanece no histórico. Comissão já paga precisa ser estornada antes.">
            <TextArea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Justificativa" />
          </Field>
          {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
          <Button className="mt-3" variant="danger" type="button" onClick={cancel}>Cancelar lançamento</Button>
        </Card>
      ) : null}
      <button className="mt-4 text-sm text-muted" type="button" onClick={() => router.push("/lancamentos")}>Voltar ao histórico</button>
    </div>
  );
}
