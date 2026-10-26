"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Empty, Field, Modal, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { COMMISSION_STATUS, brDate, brl, monthStart, pct, toAmount, todayIso } from "@/lib/format";

type Row = { id: number; service_date: string; procedure_name: string; final_amount: string; percent: string; recognized_amount: string; paid_amount: string; pending_amount: string; status: string; adjusted: boolean };
type Payment = { id: number; payment_date: string; amount: string; method_label: string; notes: string; voided: boolean; void_reason: string };
type Statement = { collaborator_id: number; collaborator_name: string; procedure_count: number; billed: string; generated: string; paid: string; pending: string; commissions: Row[]; payments: Payment[] };

export default function CommissionDetailPage() {
  const params = useParams<{ id: string }>();
  const { session, meta } = useAuth();
  const admin = session?.user.role === "admin";
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [older, setOlder] = useState(true);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [payDate, setPayDate] = useState("");
  const [method, setMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [adjust, setAdjust] = useState<{ id: number; amount: string; reason: string } | null>(null);
  const [reasonFor, setReasonFor] = useState<{ kind: "reverse" | "void"; id: number } | null>(null);
  const [reason, setReason] = useState("");

  function load(start = from, end = to, includeOlder = older) {
    if (!start || !end) return;
    const query = new URLSearchParams({ date_from: start, date_to: end, collaborator: params.id });
    if (includeOlder) query.set("include_older_pending", "true");
    api<Statement[]>(`/api/commission-statements/?${query.toString()}`).then((rows) => {
      setStatement(rows[0] || null);
      setError("");
    }).catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar."));
  }

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const start = search.get("from") || monthStart();
    const end = search.get("to") || todayIso();
    const includeOlder = search.get("older") !== "0";
    setFrom(start);
    setTo(end);
    setOlder(includeOlder);
    setPayDate(end);
    load(start, end, includeOlder);
  }, [params.id]);

  function openPay() {
    if (!statement) return;
    setSelected(Object.fromEntries(statement.commissions.filter((row) => Number(row.pending_amount) > 0).map((row) => [row.id, row.pending_amount])));
    setPaying(true);
    setError("");
  }

  async function pay() {
    if (!statement) return;
    const allocations = Object.entries(selected).filter(([, amount]) => Number(amount) > 0).map(([id, amount]) => ({ commission_id: Number(id), amount: toAmount(amount) }));
    try {
      await api("/api/commission-payments/", { method: "POST", body: JSON.stringify({ collaborator_id: statement.collaborator_id, payment_date: payDate, method, notes, allocations, client_request_id: crypto.randomUUID() }) });
      setPaying(false);
      setNotes("");
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível pagar."); }
  }

  async function confirmReason(event: React.FormEvent) {
    event.preventDefault();
    if (!reasonFor) return;
    const path = reasonFor.kind === "reverse" ? `/api/commissions/${reasonFor.id}/reverse/` : `/api/commission-payments/${reasonFor.id}/void/`;
    try {
      await api(path, { method: "POST", body: JSON.stringify({ reason }) });
      setReasonFor(null);
      setReason("");
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível estornar."); }
  }

  const back = `/comissoes`;

  return (
    <div>
      <PageHeader
        eyebrow="Comissões"
        title={statement?.collaborator_name || "Colaboradora"}
        description={statement ? `${statement.procedure_count} procedimentos · faturamento ${brl(statement.billed)} · gerada ${brl(statement.generated)} · paga ${brl(statement.paid)} · pendente ${brl(statement.pending)}` : "Nenhuma comissão neste período."}
        actions={<><Link href={back} className="text-sm text-muted">Voltar para a lista</Link>{admin && statement ? <Button type="button" onClick={openPay}>Registrar pagamento</Button> : null}</>}
      />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="De"><TextInput type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="Até"><TextInput type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
          <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={older} onChange={(event) => setOlder(event.target.checked)} /> Incluir pendências anteriores</label>
          <Button className="self-end" type="button" onClick={() => load()}>Atualizar</Button>
        </div>
      </Card>
      {error ? <p className="mb-3 text-sm text-accent">{error}</p> : null}
      {!statement ? <Empty>Nenhuma comissão no período.</Empty> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted"><tr><th className="py-2">Data</th><th>Procedimento</th><th>Final</th><th>%</th><th>Devida</th><th>Pendente</th><th></th></tr></thead>
              <tbody>
                {statement.commissions.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-2">{brDate(row.service_date)}</td>
                    <td>{row.procedure_name}</td>
                    <td>{brl(row.final_amount)}</td>
                    <td>{pct(row.percent)}</td>
                    <td>{brl(row.recognized_amount)}</td>
                    <td>{brl(row.pending_amount)}</td>
                    <td className="space-x-2 text-right">
                      <Badge tone={row.status === "paid" ? "good" : row.status === "reversed" ? "bad" : "warn"}>{COMMISSION_STATUS[row.status]}{row.adjusted ? " · ajustada" : ""}</Badge>
                      {admin && row.status !== "reversed" ? <button className="text-xs text-accent" type="button" onClick={() => setAdjust({ id: row.id, amount: row.recognized_amount, reason: "" })}>Ajustar</button> : null}
                      {admin && row.status !== "reversed" && Number(row.paid_amount) === 0 ? <button className="text-xs text-accent" type="button" onClick={() => { setReasonFor({ kind: "reverse", id: row.id }); setReason(""); }}>Estornar</button> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {statement.payments.length ? <div className="mt-4 text-sm">{statement.payments.map((payment) => (
            <p key={payment.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-2">
              <span>{brDate(payment.payment_date)} · {payment.method_label} · {brl(payment.amount)} {payment.voided ? `· estornado (${payment.void_reason})` : payment.notes}</span>
              {admin && !payment.voided ? <button className="text-xs text-accent" type="button" onClick={() => { setReasonFor({ kind: "void", id: payment.id }); setReason(""); }}>Estornar pagamento</button> : null}
            </p>
          ))}</div> : null}
        </Card>
      )}
      {paying && statement ? (
        <Modal title={`Pagar ${statement.collaborator_name}`} onClose={() => setPaying(false)}>
          <div className="space-y-3">
            {statement.commissions.filter((row) => Number(row.pending_amount) > 0).map((row) => (
              <label key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span><input className="mr-2" type="checkbox" checked={row.id in selected} onChange={(event) => setSelected((current) => { const next = { ...current }; if (event.target.checked) next[row.id] = row.pending_amount; else delete next[row.id]; return next; })} />{brDate(row.service_date)} · {row.procedure_name}</span>
                <TextInput className="w-28" value={selected[row.id] || ""} onChange={(event) => setSelected({ ...selected, [row.id]: event.target.value })} />
              </label>
            ))}
            <Field label="Data"><TextInput type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} /></Field>
            <Field label="Forma declarada"><Select value={method} onChange={(event) => setMethod(event.target.value)}>{meta?.payment_methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
            <Field label="Observações"><TextArea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="button" onClick={pay}>Confirmar pagamento</Button>
          </div>
        </Modal>
      ) : null}
      {adjust ? (
        <Modal title="Ajustar comissão" onClose={() => setAdjust(null)}>
          <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); try { await api(`/api/commissions/${adjust.id}/adjust/`, { method: "POST", body: JSON.stringify({ amount: toAmount(adjust.amount), reason: adjust.reason }) }); setAdjust(null); load(); } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível ajustar."); } }}>
            <Field label="Novo valor base" hint="A regra do lançamento continua valendo. Na regra proporcional, o devido pode ficar menor que esta base."><TextInput value={adjust.amount} onChange={(event) => setAdjust({ ...adjust, amount: event.target.value })} /></Field>
            <Field label="Justificativa"><TextArea value={adjust.reason} onChange={(event) => setAdjust({ ...adjust, reason: event.target.value })} required /></Field>
            <Button type="submit">Salvar ajuste</Button>
          </form>
        </Modal>
      ) : null}
      {reasonFor ? (
        <Modal title={reasonFor.kind === "reverse" ? "Estornar comissão" : "Estornar pagamento"} onClose={() => setReasonFor(null)}>
          <form className="space-y-3" onSubmit={confirmReason}>
            <Field label="Justificativa"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} required /></Field>
            <Button variant="danger" type="submit">Confirmar estorno</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
