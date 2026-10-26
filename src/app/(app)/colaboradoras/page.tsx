"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Empty, Field, Modal, PageHeader, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brDate, pct, toAmount, todayIso } from "@/lib/format";
import type { Collaborator } from "@/lib/types";

const blank = { full_name: "", phone: "", email: "", admission_date: "", default_commission_percent: "40.00", notes: "", is_active: true };

export default function CollaboratorsPage() {
  const { session } = useAuth();
  const admin = session?.user.role === "admin";
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");

  function load() { api<Collaborator[]>("/api/collaborators/").then(setRows).catch(() => setRows([])); }
  useEffect(load, []);
  useEffect(() => {
    if (open) setForm((current) => ({ ...current, admission_date: current.admission_date || todayIso() }));
  }, [open]);

  function close() {
    setOpen(false);
    setForm(blank);
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api("/api/collaborators/", { method: "POST", body: JSON.stringify({ ...form, default_commission_percent: toAmount(form.default_commission_percent) }) });
      close();
      load();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Equipe"
        title="Colaboradoras"
        description="A comissão padrão vale quando não houver percentual do procedimento nem um percentual específico da dupla."
        actions={admin ? <Button type="button" onClick={() => setOpen(true)}>Nova colaboradora</Button> : undefined}
      />
      {rows.length === 0 ? <Empty>Nenhuma colaboradora cadastrada.</Empty> : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th>Admissão</th>
                <th>Comissão padrão</th>
                <th>Contato</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr key={person.id} className="border-t border-line">
                  <td className="px-4 py-3"><Link href={`/colaboradoras/${person.id}`} className="font-medium hover:text-accent">{person.full_name}</Link></td>
                  <td>{brDate(person.admission_date)}</td>
                  <td>{pct(person.default_commission_percent)}</td>
                  <td className="text-muted">{[person.phone, person.email].filter(Boolean).join(" · ") || "—"}</td>
                  <td><Badge tone={person.is_active ? "good" : "neutral"}>{person.is_active ? "Ativa" : "Inativa"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open ? (
        <Modal title="Nova colaboradora" onClose={close}>
          <form className="space-y-3" onSubmit={save}>
            <Field label="Nome completo"><TextInput value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></Field>
            <Field label="Telefone"><TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="E-mail"><TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Admissão"><TextInput type="date" value={form.admission_date} onChange={(event) => setForm({ ...form, admission_date: event.target.value })} required /></Field>
            <Field label="Comissão padrão"><TextInput inputMode="decimal" value={form.default_commission_percent} onChange={(event) => setForm({ ...form, default_commission_percent: event.target.value })} required /></Field>
            <Field label="Observações"><TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Ativa</label>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit">Cadastrar</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
