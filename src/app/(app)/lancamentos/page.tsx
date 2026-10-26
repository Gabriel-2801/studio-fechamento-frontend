"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EntryForm } from "@/components/entry-form";
import { Badge, Button, Card, Empty, Field, Modal, PageHeader, Select, TextInput } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PAYMENT_STATUS, brDate, brl, monthStart, todayIso } from "@/lib/format";
import type { Collaborator, Entry, Page, Procedure } from "@/lib/types";

export default function EntriesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Entry[]>([]);
  const [creating, setCreating] = useState(false);
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [filters, setFilters] = useState({ date_from: "", date_to: "", collaborator: "", procedure: "", payment_status: "", status: "active", q: "" });
  const canFilterPeople = session?.user.role !== "collaborator";

  function load(next = filters) {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => { if (value) params.set(key, value); });
    api<Page<Entry>>(`/api/entries/?${params.toString()}`).then((page) => setRows(page.results)).catch(() => setRows([]));
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("criar") === "1") setCreating(true);
    const next = { date_from: monthStart(), date_to: todayIso(), collaborator: "", procedure: "", payment_status: "", status: "active", q: "" };
    setFilters(next);
    load(next);
    if (canFilterPeople) {
      api<Collaborator[]>("/api/collaborators/").then(setPeople).catch(() => undefined);
      api<Procedure[]>("/api/procedures/").then(setProcedures).catch(() => undefined);
    }
  }, [canFilterPeople]);

  return (
    <div>
      <PageHeader eyebrow="Consulta" title={session?.user.role === "collaborator" ? "Meus atendimentos" : "Histórico de lançamentos"} actions={session?.user.role !== "collaborator" ? <Button type="button" onClick={() => setCreating(true)}>Novo lançamento</Button> : undefined} />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="De"><TextInput type="date" value={filters.date_from} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} /></Field>
          <Field label="Até"><TextInput type="date" value={filters.date_to} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} /></Field>
          {canFilterPeople ? <Field label="Colaboradora"><Select value={filters.collaborator} onChange={(event) => setFilters({ ...filters, collaborator: event.target.value })}><option value="">Todas</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</Select></Field> : null}
          {canFilterPeople ? <Field label="Procedimento"><Select value={filters.procedure} onChange={(event) => setFilters({ ...filters, procedure: event.target.value })}><option value="">Todos</option>{procedures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field> : null}
          <Field label="Recebimento"><Select value={filters.payment_status} onChange={(event) => setFilters({ ...filters, payment_status: event.target.value })}><option value="">Todos</option><option value="pending">Pendente</option><option value="partial">Parcial</option><option value="paid">Pago</option></Select></Field>
          <Field label="Busca"><TextInput value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Procedimento ou nota" /></Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" onClick={() => load()}>Filtrar</Button>
          <Button variant="secondary" type="button" onClick={() => { const next = { ...filters, status: filters.status === "all" ? "active" : "all" }; setFilters(next); load(next); }}>{filters.status === "all" ? "Ocultar cancelados" : "Ver cancelados"}</Button>
        </div>
      </Card>
      {rows.length === 0 ? <Empty>Nenhum lançamento neste recorte.</Empty> : (
        <div className="space-y-3">
          {rows.map((entry) => (
            <Link key={entry.id} href={`/lancamentos/${entry.id}`} className="block rounded-3xl border border-line bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-muted">{brDate(entry.service_date)} · #{entry.id}</p>
                  <p className="font-medium">{entry.items.map((item) => `${item.quantity}× ${item.procedure_name}`).join(", ")}</p>
                  <p className="text-sm text-muted">{entry.items.map((item) => item.collaborator_name).filter((name, index, list) => list.indexOf(name) === index).join(", ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl">{brl(entry.final_amount)}</p>
                  <div className="mt-1 flex justify-end gap-2">
                    {entry.status === "cancelled" ? <Badge tone="bad">Cancelado</Badge> : null}
                    {entry.payment_status ? <Badge tone={entry.payment_status === "paid" ? "good" : "warn"}>{PAYMENT_STATUS[entry.payment_status]}</Badge> : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {creating ? (
        <Modal title="Novo lançamento" wide onClose={() => { setCreating(false); router.replace("/lancamentos"); }}>
          <p className="mb-4 text-sm text-muted">Escolha a colaboradora e o procedimento. O preço e a comissão são preenchidos automaticamente e conferidos no servidor.</p>
          <EntryForm />
        </Modal>
      ) : null}
    </div>
  );
}
