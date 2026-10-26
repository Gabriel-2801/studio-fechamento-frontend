"use client";

import { useEffect, useState } from "react";
import { Button, Card, Field, Modal, PageHeader, Select, TextInput } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Collaborator, Page, User } from "@/lib/types";

type Settings = { studio_name: string; partial_payment_commission_policy: string; require_price_change_justification: boolean; policy_description: string };
type Log = { id: number; action: string; description: string; created_at: string; user: string };

export default function SettingsPage() {
  const { meta, refreshSession } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState({ current_password: "", new_password: "" });
  const [creatingUser, setCreatingUser] = useState(false);
  const [created, setCreated] = useState({ username: "", password: "", first_name: "", role: "operator", collaborator: "" });

  function load() {
    api<Settings>("/api/settings/").then(setSettings).catch(() => undefined);
    api<User[]>("/api/users/").then(setUsers).catch(() => undefined);
    api<Collaborator[]>("/api/collaborators/").then(setPeople).catch(() => undefined);
    api<Page<Log>>("/api/audit-logs/").then((page) => setLogs(page.results)).catch(() => undefined);
  }
  useEffect(load, []);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    try {
      const saved = await api<Settings>("/api/settings/", { method: "PATCH", body: JSON.stringify(settings) });
      setSettings(saved); setMessage("Configuração salva. A nova regra vale para os próximos lançamentos."); setError("");
      await refreshSession();
    } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível salvar."); }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Acesso" title="Configurações" description="A regra de comissão parcial fica gravada em cada lançamento. Trocar aqui não reescreve o passado." />
      {settings ? (
        <Card>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={saveSettings}>
            <Field label="Nome do studio"><TextInput value={settings.studio_name} onChange={(event) => setSettings({ ...settings, studio_name: event.target.value })} /></Field>
            <Field label="Comissão quando o recebimento é parcial"><Select value={settings.partial_payment_commission_policy} onChange={(event) => setSettings({ ...settings, partial_payment_commission_policy: event.target.value })}>{meta?.commission_policies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
            <p className="md:col-span-2 text-sm leading-6 text-muted">{meta?.commission_policies.find((item) => item.value === settings.partial_payment_commission_policy)?.description}</p>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={settings.require_price_change_justification} onChange={(event) => setSettings({ ...settings, require_price_change_justification: event.target.checked })} /> Exigir justificativa quando o valor cobrado diferir do preço cadastrado</label>
            <Button type="submit">Salvar configuração</Button>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-medium">Usuárias</h2>
            <Button type="button" onClick={() => setCreatingUser(true)}>Nova usuária</Button>
          </div>
          <ul className="space-y-2 text-sm">{users.map((user) => <li key={user.id} className="flex justify-between gap-2 border-t border-line py-2"><span>{user.first_name || user.username}</span><span className="text-muted">{user.role}{user.is_active ? "" : " · inativa"}</span></li>)}</ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-medium">Trocar minha senha</h2>
          <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); try { await api("/api/auth/password/", { method: "POST", body: JSON.stringify(password) }); setPassword({ current_password: "", new_password: "" }); setMessage("Senha alterada."); } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível alterar."); } }}>
            <Field label="Senha atual"><TextInput type="password" value={password.current_password} onChange={(event) => setPassword({ ...password, current_password: event.target.value })} /></Field>
            <Field label="Nova senha"><TextInput type="password" value={password.new_password} onChange={(event) => setPassword({ ...password, new_password: event.target.value })} /></Field>
            <Button type="submit">Alterar senha</Button>
          </form>
          <h2 className="mb-2 mt-6 font-medium">Auditoria recente</h2>
          <ul className="space-y-2 text-sm">{logs.map((log) => <li key={log.id}><span className="text-muted">{log.user}</span> — {log.description}</li>)}</ul>
        </Card>
      </div>
      {message ? <p className="text-sm text-moss">{message}</p> : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {creatingUser ? (
        <Modal title="Nova usuária" onClose={() => setCreatingUser(false)}>
          <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); try { await api("/api/users/", { method: "POST", body: JSON.stringify({ ...created, collaborator: created.collaborator ? Number(created.collaborator) : null }) }); setCreated({ username: "", password: "", first_name: "", role: "operator", collaborator: "" }); setMessage("Usuária criada."); setCreatingUser(false); load(); } catch (err) { setError(err instanceof ApiError ? err.message : "Não foi possível criar."); } }}>
            <Field label="Nome"><TextInput value={created.first_name} onChange={(event) => setCreated({ ...created, first_name: event.target.value })} /></Field>
            <Field label="Usuária"><TextInput value={created.username} onChange={(event) => setCreated({ ...created, username: event.target.value })} required /></Field>
            <Field label="Senha"><TextInput type="password" value={created.password} onChange={(event) => setCreated({ ...created, password: event.target.value })} required /></Field>
            <Field label="Perfil"><Select value={created.role} onChange={(event) => setCreated({ ...created, role: event.target.value })}>{meta?.roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</Select></Field>
            {created.role === "collaborator" ? <Field label="Colaboradora"><Select value={created.collaborator} onChange={(event) => setCreated({ ...created, collaborator: event.target.value })} required><option value="">Selecionar</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</Select></Field> : null}
            {error ? <p className="text-sm text-accent">{error}</p> : null}
            <Button type="submit">Criar usuária</Button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
