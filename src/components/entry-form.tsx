"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Select, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { amount, brl, pct, todayIso, toAmount } from "@/lib/format";
import type { Collaborator, Entry, Procedure } from "@/lib/types";

type Line = { key: string; collaboratorId: string; procedureId: string; quantity: string; unitPrice: string; discount: string; justification: string };
type PayLine = { key: string; method: string; amount: string; notes: string };

const emptyLine = (key = "line-1"): Line => ({ key, collaboratorId: "", procedureId: "", quantity: "1", unitPrice: "", discount: "0.00", justification: "" });
const emptyPay = (key = "pay-1"): PayLine => ({ key, method: "pix", amount: "", notes: "" });

function lineFinal(line: Line) {
  return Math.max(0, amount(line.unitPrice) * Number(line.quantity || 0) - amount(line.discount));
}

export function EntryForm({ initial }: { initial?: Entry }) {
  const router = useRouter();
  const { session, meta } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [date, setDate] = useState(initial?.service_date || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [lines, setLines] = useState<Line[]>(() => (initial ? initial.items.map(itemToLine) : [emptyLine()]));
  const [payments, setPayments] = useState<PayLine[]>(() =>
    initial?.payments.length ? initial.payments.map((payment) => ({ key: crypto.randomUUID(), method: payment.method, amount: payment.amount, notes: payment.notes })) : [emptyPay()],
  );
  const [preview, setPreview] = useState<PeriodLike | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const requestId = useRef(initial ? null : crypto.randomUUID());

  useEffect(() => {
    if (!date) setDate(todayIso());
    Promise.all([api<Collaborator[]>("/api/collaborators/?active=true"), api<Procedure[]>("/api/procedures/?active=true")]).then(([people, catalog]) => {
      setCollaborators(people);
      setProcedures(catalog);
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os cadastros."));
  }, []);

  const payload = useMemo(() => buildPayload(date, notes, lines, payments, requestId.current), [date, notes, lines, payments]);

  useEffect(() => {
    if (!payload) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => {
      api<PeriodLike>("/api/entries/preview/", { method: "POST", body: JSON.stringify(payload) })
        .then((data) => {
          setPreview(data);
          setError("");
        })
        .catch((err) => {
          setPreview(null);
          if (err instanceof ApiError) setError(err.message);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [payload]);

  function updateLine(key: string, patch: Partial<Line>) {
    setError("");
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  function chooseProcedure(key: string, procedureId: string) {
    const procedure = procedures.find((item) => String(item.id) === procedureId);
    updateLine(key, { procedureId, unitPrice: procedure?.default_price || "" });
  }

  async function save() {
    if (!payload) {
      setError("Informe colaboradora, procedimento e quantidade em cada linha.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const path = initial ? `/api/entries/${initial.id}/` : "/api/entries/";
      const saved = await api<Entry>(path, { method: initial ? "PUT" : "POST", body: JSON.stringify(payload) });
      router.push(`/lancamentos/${saved.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const methods = meta?.payment_methods || [];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Data do atendimento" hint="Somente procedimento já realizado.">
              <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label="Observação">
              <TextInput value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional. Sem cadastro de cliente." />
            </Field>
          </div>
        </Card>
        {lines.map((line, index) => {
          const procedure = procedures.find((item) => String(item.id) === line.procedureId);
          const finalValue = lineFinal(line);
          const catalogTotal = procedure ? Number(procedure.default_price) * Number(line.quantity || 0) : 0;
          const changed = procedure && Math.abs(finalValue - catalogTotal) > 0.001;
          const previewItem = preview?.items?.[index];
          return (
            <Card key={line.key}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium">Procedimento {index + 1}</h2>
                {lines.length > 1 ? <button className="text-sm text-accent" type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Remover</button> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Colaboradora">
                  <Select value={line.collaboratorId} onChange={(event) => updateLine(line.key, { collaboratorId: event.target.value })}>
                    <option value="">Selecionar</option>
                    {collaborators.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {pct(person.default_commission_percent)}</option>)}
                  </Select>
                </Field>
                <Field label="Procedimento">
                  <Select value={line.procedureId} onChange={(event) => chooseProcedure(line.key, event.target.value)}>
                    <option value="">Selecionar</option>
                    {procedures.map((item) => <option key={item.id} value={item.id}>{item.name} · {brl(item.default_price)}</option>)}
                  </Select>
                </Field>
                <Field label="Quantidade">
                  <TextInput inputMode="numeric" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} />
                </Field>
                <Field label="Preço unitário cobrado" hint={procedure ? `Tabela ${brl(procedure.default_price)}` : undefined}>
                  <TextInput inputMode="decimal" value={line.unitPrice} onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })} onBlur={(event) => updateLine(line.key, { unitPrice: toAmount(event.target.value) })} />
                </Field>
                <Field label="Desconto adicional" hint="Valor negativo registra acréscimo.">
                  <TextInput inputMode="decimal" value={line.discount} onChange={(event) => updateLine(line.key, { discount: event.target.value })} onBlur={(event) => updateLine(line.key, { discount: toAmount(event.target.value) || "0.00" })} />
                </Field>
                <Field label="Valor final da linha">
                  <TextInput value={brl(finalValue)} readOnly />
                </Field>
              </div>
              {changed || line.justification ? (
                <div className="mt-3">
                  <Field label="Justificativa da diferença de preço" hint={session?.require_price_change_justification ? "Obrigatória quando o valor final difere da tabela." : "Opcional nesta configuração."}>
                    <TextArea value={line.justification} onChange={(event) => updateLine(line.key, { justification: event.target.value })} />
                  </Field>
                </div>
              ) : null}
              {previewItem ? <p className="mt-3 text-sm text-muted">Comissão {pct(previewItem.commission_percent)} · {previewItem.commission_rule_label} · {brl(previewItem.commission_generated)}</p> : null}
            </Card>
          );
        })}
        <Button variant="secondary" type="button" onClick={() => setLines((current) => [...current, emptyLine(crypto.randomUUID())])}>Adicionar procedimento</Button>
        <Card>
          <h2 className="mb-3 font-medium">Pagamento declarado</h2>
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.key} className="grid gap-3 md:grid-cols-[1fr_140px_1fr_auto]">
                <Select value={payment.method} onChange={(event) => setPayments((current) => current.map((item) => item.key === payment.key ? { ...item, method: event.target.value } : item))}>
                  {methods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                </Select>
                <TextInput inputMode="decimal" placeholder="0,00" value={payment.amount} onChange={(event) => setPayments((current) => current.map((item) => item.key === payment.key ? { ...item, amount: event.target.value } : item))} onBlur={(event) => setPayments((current) => current.map((item) => item.key === payment.key ? { ...item, amount: toAmount(event.target.value) } : item))} />
                <TextInput placeholder={payment.method === "other" ? "Descreva a forma" : "Observação"} value={payment.notes} onChange={(event) => setPayments((current) => current.map((item) => item.key === payment.key ? { ...item, notes: event.target.value } : item))} />
                <button className="text-sm text-accent" type="button" onClick={() => setPayments((current) => current.filter((item) => item.key !== payment.key))}>Remover</button>
              </div>
            ))}
          </div>
          <Button className="mt-3" variant="secondary" type="button" onClick={() => setPayments((current) => [...current, emptyPay(crypto.randomUUID())])}>Dividir pagamento</Button>
        </Card>
      </div>
      <Card className="lg:sticky lg:top-6">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Resumo calculado no servidor</p>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Total do lançamento" value={brl(preview?.final_amount)} />
          <Row label="Descontos" value={brl(preview?.discount_amount)} />
          <Row label="Comissões geradas" value={brl(preview?.commission_generated)} />
          <Row label="Comissões devidas agora" value={brl(preview?.commission_recognized)} />
          <Row label="Restante do studio" value={brl(preview?.studio_amount)} />
          <Row label="Recebido declarado" value={brl(preview?.received_amount)} />
          <Row label="Pendente" value={brl(preview?.pending_amount)} />
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted">{session?.commission_precedence}</p>
        {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
        <Button className="mt-4 w-full" type="button" onClick={save} disabled={saving}>{saving ? "Salvando…" : initial ? "Salvar correção" : "Confirmar lançamento"}</Button>
      </Card>
      </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function itemToLine(item: Entry["items"][number]): Line {
  return {
    key: crypto.randomUUID(),
    collaboratorId: String(item.collaborator_id),
    procedureId: String(item.procedure_id),
    quantity: String(item.quantity),
    unitPrice: item.catalog_unit_price,
    discount: item.discount_amount,
    justification: item.justification,
  };
}

function buildPayload(date: string, notes: string, lines: Line[], payments: PayLine[], requestId: string | null) {
  if (lines.some((line) => !line.collaboratorId || !line.procedureId || Number(line.quantity) < 1)) return null;
  return {
    service_date: date,
    notes,
    client_request_id: requestId,
    items: lines.map((line) => ({
      collaborator_id: Number(line.collaboratorId),
      procedure_id: Number(line.procedureId),
      quantity: Number(line.quantity),
      final_amount: lineFinal(line).toFixed(2),
      justification: line.justification,
    })),
    payments: payments.filter((payment) => amount(payment.amount) > 0).map((payment) => ({ method: payment.method, amount: toAmount(payment.amount), notes: payment.notes })),
  };
}

type PeriodLike = {
  final_amount: string;
  discount_amount: string;
  commission_generated: string;
  commission_recognized: string;
  studio_amount: string;
  received_amount: string;
  pending_amount: string;
  items: { commission_percent: string; commission_rule_label: string; commission_generated: string }[];
};
