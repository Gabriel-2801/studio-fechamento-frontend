"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, Modal, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brDate, pct, toAmount } from "@/lib/format";
import type { Collaborator, Procedure } from "@/lib/types";

type Override = { id: number; procedure: number; procedure_name: string; commission_percent: string };

export default function CollaboratorDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const admin = session?.user.role === "admin";
  const [person, setPerson] = useState<Collaborator | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", admission_date: "", default_commission_percent: "", notes: "", is_active: true });
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [rows, setRows] = useState<Override[]>([]);
  const [open, setOpen] = useState(false);
  const [procedure, setProcedure] = useState("");
  const [percent, setPercent] = useState("");
  const [missing, setMissing] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function loadOverrides() {
    api<Override[]>(`/api/collaborator-commissions/?collaborator=${params.id}`).then(setRows).catch(() => setRows([]));
  }

  useEffect(() => {
    api<Collaborator>(`/api/collaborators/${params.id}/`).then((record) => {
      setPerson(record);
      setForm({
        full_name: record.full_name,
        phone: record.phone,
        email: record.email,
        admission_date: record.admission_date,
        default_commission_percent: record.default_commission_percent,
        notes: record.notes,
        is_active: record.is_active,
      });
    }).catch(() => { setPerson(null); setMissing("Colaboradora não encontrada."); });
    if (admin) api<Procedure[]>("/api/procedures/").then(setProcedures).catch(() => undefined);
    if (admin) loadOverrides();
  }, [params.id, admin]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const saved = await api<Collaborator>(`/api/collaborators/${params.id}/`, { method: "PATCH", body: JSON.stringify({ ...form, default_commission_percent: toAmount(form.default_commission_percent) }) });
      setPerson(saved);
      setMessage("Cadastro atualizado. Comissões já lançadas não mudam.");
      setError("");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api("/api/collaborator-commissions/", { method: "POST", body: JSON.stringify({ collaborator: Number(params.id), procedure: Number(procedure), commission_percent: toAmount(percent) }) });
      setProcedure("");
      setPercent("");
      setOpen(false);
      setError("");
      loadOverrides();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  if (!person) return <p className="text-sm text-muted">{missing || "Carregando colaboradora…"}</p>;

  return (
    <div>
      <PageHeader
        eyebrow="Colaboradora"
        title={person.full_name}
        description="A comissão específica desta dupla prevalece sobre a do procedimento e sobre a comissão padrão."
        actions={<Link href="/colaboradoras" className="text-sm text-muted">Voltar para a lista</Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={person.is_active ? "good" : "neutral"}>{person.is_active ? "Ativa" : "Inativa"}</Badge>
        <Badge>Padrão {pct(person.default_commission_percent)}</Badge>
        <Badge>Admissão {brDate(person.admission_date)}</Badge>
      </div>
      {admin ? (
        <Card className="mb-4">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
            <Field label="Nome completo"><TextInput value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required /></Field>
            <Field label="Telefone"><TextInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
            <Field label="E-mail"><TextInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
            <Field label="Admissão"><TextInput type="date" value={form.admission_date} onChange={(event) => setForm({ ...form, admission_date: event.target.value })} required /></Field>
            <Field label="Comissão padrão"><TextInput inputMode="decimal" value={form.default_commission_percent} onChange={(event) => setForm({ ...form, default_commission_percent: event.target.value })} required /></Field>
            <div className="md:col-span-2"><Field label="Observações"><TextArea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Ativa</label>
            {message ? <p className="text-sm text-moss md:col-span-2">{message}</p> : null}
            {error && !open ? <p className="text-sm text-accent md:col-span-2">{error}</p> : null}
            <Button type="submit">Salvar alterações</Button>
          </form>
        </Card>
      ) : (
        <Card className="mb-4">
          <p className="text-sm text-muted">{[person.phone, person.email].filter(Boolean).join(" · ") || "Sem contato"}</p>
          {person.notes ? <p className="mt-2 text-sm">{person.notes}</p> : null}
        </Card>
      )}
      {admin ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Comissões específicas</h2>
              <p className="text-sm text-muted">Lançamentos já feitos não mudam.</p>
            </div>
            <Button type="button" onClick={() => { setOpen(true); setError(""); }}>Nova comissão</Button>
          </div>
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2 text-sm">
                <p>{row.procedure_name} · {pct(row.commission_percent)}</p>
                <Button variant="danger" type="button" onClick={async () => { await api(`/api/collaborator-commissions/${row.id}/`, { method: "DELETE" }); loadOverrides(); }}>Remover</Button>
              </div>
            ))}
            {rows.length === 0 ? <p className="text-sm text-muted">Nenhuma comissão específica. Vale o percentual do procedimento ou os {pct(person.default_commission_percent)} padrão.</p> : null}
          </div>
        </Card>
      ) : null}
      {open ? (
        <Modal title="Nova comissão específica" onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={add}>
            <Field label="Procedimento"><Select value={procedure} onChange={(event) => setProcedure(event.target.value)} required><option value="">Selecionar</option>{procedures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Percentual"><TextInput inputMode="decimal" value={percent} onChange={(event) => setPercent(event.target.value)} required /></Field>
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit">Adicionar</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
