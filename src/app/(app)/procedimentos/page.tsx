"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Empty, Field, Modal, PageHeader, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brl, pct, toAmount } from "@/lib/format";
import type { Procedure } from "@/lib/types";

const blank = { name: "", description: "", category: "", default_price: "", specific_commission_percent: "", is_active: true };

export default function ProceduresPage() {
  const { session } = useAuth();
  const admin = session?.user.role === "admin";
  const [rows, setRows] = useState<Procedure[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  function load() { api<Procedure[]>("/api/procedures/").then(setRows).catch(() => setRows([])); }
  useEffect(load, []);

  function close() {
    setOpen(false);
    setForm(blank);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const payload = {
      ...form,
      default_price: toAmount(form.default_price),
      specific_commission_percent: form.specific_commission_percent ? toAmount(form.specific_commission_percent) : null,
    };
    try {
      await api("/api/procedures/", { method: "POST", body: JSON.stringify(payload) });
      close();
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Procedimentos"
        description="O preço lançado fica copiado no atendimento. Mudar o catálogo não altera o histórico."
        actions={admin ? <Button type="button" onClick={() => setOpen(true)}>Novo procedimento</Button> : undefined}
      />
      {rows.length === 0 ? <Empty>Nenhum procedimento cadastrado.</Empty> : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Procedimento</th>
                <th>Categoria</th>
                <th>Preço</th>
                <th>Comissão específica</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link href={`/procedimentos/${item.id}`} className="font-medium hover:text-accent">{item.name}</Link>
                    {item.description ? <p className="text-xs text-muted">{item.description}</p> : null}
                  </td>
                  <td>{item.category}</td>
                  <td>{brl(item.default_price)}</td>
                  <td>{item.specific_commission_percent ? pct(item.specific_commission_percent) : "—"}</td>
                  <td><Badge tone={item.is_active ? "good" : "neutral"}>{item.is_active ? "Ativo" : "Inativo"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? (
        <Modal title="Novo procedimento" onClose={close}>
          <form className="space-y-3" onSubmit={save}>
            <Field label="Nome"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Categoria"><TextInput list="categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></Field>
            <datalist id="categories"><option value="Sobrancelhas" /><option value="Cílios" /><option value="Cabelo" /><option value="Unhas" /></datalist>
            <Field label="Descrição"><TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="Preço padrão"><TextInput inputMode="decimal" value={form.default_price} onChange={(event) => setForm({ ...form, default_price: event.target.value })} required /></Field>
            <Field label="Comissão específica" hint="Opcional. Fica abaixo da comissão da colaboradora naquele procedimento."><TextInput inputMode="decimal" value={form.specific_commission_percent} onChange={(event) => setForm({ ...form, specific_commission_percent: event.target.value })} placeholder="Vazio usa a regra seguinte" /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Ativo</label>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit">Cadastrar</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
