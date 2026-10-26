"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, Field, PageHeader, TextArea, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { brl, pct, toAmount } from "@/lib/format";
import type { Procedure } from "@/lib/types";

export default function ProcedureDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const admin = session?.user.role === "admin";
  const [item, setItem] = useState<Procedure | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "", default_price: "", specific_commission_percent: "", is_active: true });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<Procedure>(`/api/procedures/${params.id}/`).then((procedure) => {
      setItem(procedure);
      setForm({
        name: procedure.name,
        description: procedure.description,
        category: procedure.category,
        default_price: procedure.default_price,
        specific_commission_percent: procedure.specific_commission_percent || "",
        is_active: procedure.is_active,
      });
    }).catch(() => { setItem(null); setError("Procedimento não encontrado."); });
  }, [params.id]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const payload = {
      ...form,
      default_price: toAmount(form.default_price),
      specific_commission_percent: form.specific_commission_percent ? toAmount(form.specific_commission_percent) : null,
    };
    try {
      const saved = await api<Procedure>(`/api/procedures/${params.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
      setItem(saved);
      setMessage("Procedimento atualizado. Lançamentos antigos continuam com o preço e a comissão da época.");
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  if (!item) return <p className="text-sm text-muted">{error || "Carregando procedimento…"}</p>;

  return (
    <div>
      <PageHeader
        eyebrow={item.category}
        title={item.name}
        description="Alterar este cadastro não reescreve atendimentos já lançados."
        actions={<Link href="/procedimentos" className="text-sm text-muted">Voltar para a lista</Link>}
      />
      <div className="mb-4 flex gap-2">
        <Badge tone={item.is_active ? "good" : "neutral"}>{item.is_active ? "Ativo" : "Inativo"}</Badge>
        <Badge>{brl(item.default_price)}</Badge>
        <Badge>Comissão {item.specific_commission_percent ? pct(item.specific_commission_percent) : "não definida"}</Badge>
      </div>
      {admin ? (
        <Card>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={save}>
            <Field label="Nome"><TextInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Categoria"><TextInput list="categories" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} required /></Field>
            <datalist id="categories"><option value="Sobrancelhas" /><option value="Cílios" /><option value="Cabelo" /><option value="Unhas" /></datalist>
            <Field label="Preço padrão"><TextInput inputMode="decimal" value={form.default_price} onChange={(event) => setForm({ ...form, default_price: event.target.value })} required /></Field>
            <Field label="Comissão específica" hint="Opcional. Fica abaixo da comissão da colaboradora naquele procedimento."><TextInput inputMode="decimal" value={form.specific_commission_percent} onChange={(event) => setForm({ ...form, specific_commission_percent: event.target.value })} placeholder="Vazio usa a regra seguinte" /></Field>
            <div className="md:col-span-2"><Field label="Descrição"><TextArea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Ativo</label>
            {message ? <p className="text-sm text-moss md:col-span-2">{message}</p> : null}
            {error ? <p className="text-sm text-accent md:col-span-2">{error}</p> : null}
            <Button type="submit">Salvar alterações</Button>
          </form>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-muted">{item.description || "Sem descrição."}</p>
          <p className="mt-3 text-sm">Preço {brl(item.default_price)}. Comissão específica {item.specific_commission_percent ? pct(item.specific_commission_percent) : "não definida"}.</p>
        </Card>
      )}
    </div>
  );
}
