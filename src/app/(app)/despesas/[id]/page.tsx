"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Modal, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brDate, brl, todayIso } from "@/lib/format";

type Expense = { id: number; date: string; category_label: string; description: string; amount: string; payment_method: string; payment_method_label: string; payment_status: string; paid_on: string | null; payment_notes: string; notes: string; cancelled: boolean; cancellation_reason: string };

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const { meta } = useAuth();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payment, setPayment] = useState({ payment_date: "", payment_method: "pix", notes: "" });

  function load() {
    api<Expense>(`/api/expenses/${params.id}/`).then(setExpense).catch((err) => setError(err instanceof ApiError ? err.message : "Despesa não encontrada."));
  }
  useEffect(load, [params.id]);

  function openPayment() {
    if (!expense) return;
    setPayment({ payment_date: todayIso(), payment_method: expense.payment_method || "pix", notes: "" });
    setPaying(true);
    setError("");
  }

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = await api<Expense>(`/api/expenses/${params.id}/pay/`, { method: "POST", body: JSON.stringify(payment) });
      setExpense(saved);
      setPaying(false);
      setError("");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível registrar o pagamento."); }
  }

  async function cancel() {
    try {
      const saved = await api<Expense>(`/api/expenses/${params.id}/cancel/`, { method: "POST", body: JSON.stringify({ reason }) });
      setExpense(saved);
      setReason("");
      setError("");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível cancelar."); }
  }

  if (!expense) return <p className="text-sm text-muted">{error || "Carregando despesa…"}</p>;

  return (
    <div>
      <PageHeader
        eyebrow={brDate(expense.date)}
        title={expense.description}
        description="Este registro entra no resultado gerencial estimado. Cancelar exige justificativa e fica no histórico."
        actions={<><Link href="/despesas" className="text-sm text-muted">Voltar para a lista</Link>{!expense.cancelled && expense.payment_status !== "paid" ? <Button type="button" onClick={openPayment}>Registrar pagamento</Button> : null}</>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={expense.cancelled ? "bad" : expense.payment_status === "paid" ? "good" : "warn"}>{expense.cancelled ? "Cancelada" : expense.payment_status === "paid" ? "Paga" : "Pendente"}</Badge>
        <Badge>{expense.category_label}</Badge>
        <Badge>{brl(expense.amount)}</Badge>
      </div>
      <Card>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Forma declarada</dt><dd>{expense.payment_method_label}</dd></div>
          <div><dt className="text-muted">Valor</dt><dd>{brl(expense.amount)}</dd></div>
          <div><dt className="text-muted">Pagamento</dt><dd>{expense.paid_on ? `Pago em ${brDate(expense.paid_on)}` : "Ainda não pago"}</dd></div>
          <div className="md:col-span-2"><dt className="text-muted">Observações</dt><dd>{expense.notes || "—"}</dd></div>
          {expense.payment_notes ? <div className="md:col-span-2"><dt className="text-muted">Observação do pagamento</dt><dd>{expense.payment_notes}</dd></div> : null}
        </dl>
        {expense.cancelled ? <p className="mt-4 text-sm text-accent">Cancelada: {expense.cancellation_reason}</p> : (
          <div className="mt-5 max-w-xl space-y-3">
            <Field label="Justificativa do cancelamento"><TextArea value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button variant="danger" type="button" onClick={cancel}>Cancelar despesa</Button>
          </div>
        )}
      </Card>
      {paying ? (
        <Modal title="Registrar pagamento" onClose={() => setPaying(false)}>
          <form className="space-y-3" onSubmit={pay}>
            <p className="text-sm text-muted">Este registro declara que a despesa de {brl(expense.amount)} foi paga. Não há confirmação bancária.</p>
            <Field label="Data do pagamento"><TextInput type="date" value={payment.payment_date} onChange={(event) => setPayment({ ...payment, payment_date: event.target.value })} required /></Field>
            <Field label="Forma declarada"><Select value={payment.payment_method} onChange={(event) => setPayment({ ...payment, payment_method: event.target.value })}>{meta?.payment_methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
            <Field label="Observação"><TextArea value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} /></Field>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit">Confirmar pagamento</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
