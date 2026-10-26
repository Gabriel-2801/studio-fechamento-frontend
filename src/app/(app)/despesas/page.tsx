"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Empty, Field, Modal, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brDate, brl, monthStart, toAmount, todayIso } from "@/lib/format";
import type { Page } from "@/lib/types";

type Expense = { id: number; date: string; category_label: string; description: string; amount: string; payment_method_label: string; payment_status: string; cancelled: boolean };

const blank = { date: "", category: "rent", description: "", amount: "", payment_method: "pix", payment_status: "pending", notes: "" };

export default function ExpensesPage() {
  const { meta } = useAuth();
  const [rows, setRows] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  function load() {
    api<Page<Expense>>(`/api/expenses/?date_from=${monthStart()}&date_to=${todayIso()}&include_cancelled=true`).then((page) => setRows(page.results)).catch(() => setRows([]));
  }
  useEffect(load, []);
  useEffect(() => {
    if (open) setForm((current) => ({ ...current, date: current.date || todayIso() }));
  }, [open]);

  function close() {
    setOpen(false);
    setForm(blank);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api("/api/expenses/", { method: "POST", body: JSON.stringify({ ...form, amount: toAmount(form.amount), client_request_id: crypto.randomUUID() }) });
      close();
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Saídas"
        title="Despesas"
        description="Despesa cadastrada e despesa paga são diferentes. O resultado estimado desconta as registradas."
        actions={<Button type="button" onClick={() => setOpen(true)}>Nova despesa</Button>}
      />
      {rows.length === 0 ? <Empty>Nenhuma despesa no mês.</Empty> : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Forma</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => (
                <tr key={expense.id} className="border-t border-line">
                  <td className="px-4 py-3">{brDate(expense.date)}</td>
                  <td><Link href={`/despesas/${expense.id}`} className="font-medium hover:text-accent">{expense.description}</Link></td>
                  <td>{expense.category_label}</td>
                  <td>{brl(expense.amount)}</td>
                  <td>{expense.payment_method_label}</td>
                  <td><Badge tone={expense.cancelled ? "bad" : expense.payment_status === "paid" ? "good" : "warn"}>{expense.cancelled ? "Cancelada" : expense.payment_status === "paid" ? "Paga" : "Pendente"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? (
        <Modal title="Nova despesa" onClose={close}>
          <form className="space-y-3" onSubmit={save}>
            <Field label="Data"><TextInput type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></Field>
            <Field label="Categoria"><Select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{meta?.expense_categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
            <Field label="Descrição"><TextInput value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></Field>
            <Field label="Valor"><TextInput inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></Field>
            <Field label="Forma declarada"><Select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}>{meta?.payment_methods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
            <Field label="Status" hint="Se ainda não foi paga, deixe pendente e registre o pagamento no detalhe."><Select value={form.payment_status} onChange={(event) => setForm({ ...form, payment_status: event.target.value })}><option value="pending">Pendente</option><option value="paid">Já paga</option></Select></Field>
            <Field label="Observações"><TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit">Registrar</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
