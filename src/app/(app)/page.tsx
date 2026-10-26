"use client";

import { useEffect, useState } from "react";
import { Banner, Card, Field, PageHeader, Select, Stat, TextInput } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CLOSING_STATUS, brl, todayIso } from "@/lib/format";
import type { Collaborator, Dashboard, Procedure } from "@/lib/types";

export default function DashboardPage() {
  const { session } = useAuth();
  const [date, setDate] = useState("");
  const [collaborator, setCollaborator] = useState("");
  const [procedure, setProcedure] = useState("");
  const [payment, setPayment] = useState("");
  const [people, setPeople] = useState<Collaborator[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [data, setData] = useState<Dashboard | null>(null);
  const admin = session?.user.role === "admin" || session?.user.role === "operator";

  useEffect(() => {
    if (!admin) return;
    api<Collaborator[]>("/api/collaborators/").then(setPeople).catch(() => undefined);
    api<Procedure[]>("/api/procedures/").then(setProcedures).catch(() => undefined);
  }, [admin]);

  useEffect(() => { setDate(todayIso()); }, []);

  useEffect(() => {
    if (!date) return;
    const params = new URLSearchParams({ date });
    if (collaborator) params.set("collaborator", collaborator);
    if (procedure) params.set("procedure", procedure);
    if (payment) params.set("payment_status", payment);
    api<Dashboard>(`/api/dashboard/?${params.toString()}`).then(setData).catch(() => setData(null));
  }, [date, collaborator, procedure, payment]);

  const personal = data?.scope === "collaborator";

  return (
    <div>
      <PageHeader eyebrow="Visão do período" title={personal ? "Meu painel" : "Dashboard"} description="Os números saem dos lançamentos registrados. Não há movimento fictício nem confirmação de banco." />
      {data ? <Banner>{data.disclaimer}</Banner> : null}
      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Data"><TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} /></Field>
          {admin ? <Field label="Colaboradora"><Select value={collaborator} onChange={(event) => setCollaborator(event.target.value)}><option value="">Todas</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</Select></Field> : null}
          {admin ? <Field label="Procedimento"><Select value={procedure} onChange={(event) => setProcedure(event.target.value)}><option value="">Todos</option>{procedures.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field> : null}
          <Field label="Recebimento"><Select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="">Todos</option><option value="pending">Pendente</option><option value="partial">Parcial</option><option value="paid">Pago</option></Select></Field>
        </div>
      </Card>
      {data ? (
        <>
          <h2 className="mb-3 font-display text-2xl">Dia · caixa {CLOSING_STATUS[data.day.closing_status || "open"]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Faturamento bruto" value={brl(data.day.gross_amount)} />
            <Stat label="Descontos" value={brl(data.day.discount_amount)} />
            <Stat label="Após descontos" value={brl(data.day.net_amount)} hint={`${data.day.procedure_count} procedimentos`} />
            <Stat label="Recebido declarado" value={brl(data.day.received_amount)} hint={`Pendente ${brl(data.day.pending_amount)}`} />
            <Stat label="Comissões geradas" value={brl(data.day.commission_generated)} />
            <Stat label="Restante após comissões" value={brl(data.day.studio_amount)} />
            {!personal && data.day.expenses_registered !== null ? <Stat label="Despesas do dia" value={brl(data.day.expenses_registered)} hint={`Pagas ${brl(data.day.expenses_paid)}`} /> : null}
            {!personal ? <Stat label="Comissões pagas nesta data" value={brl(data.day.commission_payments_total)} hint="Pagamento à profissional, não o recebimento do cliente." /> : null}
          </div>
          <h2 className="mb-3 mt-8 font-display text-2xl">Mês · {CLOSING_STATUS[data.month.closing_status || "open"]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Faturamento acumulado" value={brl(data.month.net_amount)} />
            <Stat label="Descontos" value={brl(data.month.discount_amount)} />
            <Stat label="Comissões geradas" value={brl(data.month.commission_generated)} />
            <Stat label="Comissões pagas" value={brl(data.month.commission_paid)} hint={`Pendentes ${brl(data.month.commission_pending)}`} />
            {!personal && data.month.expenses_registered !== null ? <Stat label="Despesas registradas" value={brl(data.month.expenses_registered)} hint={`Pagas ${brl(data.month.expenses_paid)} · pendentes ${brl(data.month.expenses_pending)}`} /> : null}
            {!personal && data.month.estimated_result !== null ? <Stat label="Resultado gerencial estimado" value={brl(data.month.estimated_result)} hint={data.month.result_explanation || data.formula} /> : null}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-medium">Por colaboradora</h3>
              <SimpleTable headers={["Nome", "Procedimentos", "Faturamento", "Comissão devida", "Pendente"]} rows={data.by_collaborator.map((row) => [row.name, String(row.procedure_count), brl(row.net), brl(row.recognized), brl(row.pending)])} />
            </Card>
            <Card>
              <h3 className="mb-3 font-medium">Procedimentos do mês</h3>
              <SimpleTable headers={["Procedimento", "Qtd.", "Faturamento"]} rows={data.top_procedures.map((row) => [row.name, String(row.quantity), brl(row.net)])} />
            </Card>
            <Card>
              <h3 className="mb-3 font-medium">Formas de pagamento declaradas</h3>
              <SimpleTable headers={["Forma", "Valor"]} rows={data.by_payment_method.map((row) => [row.label, brl(row.amount)])} />
            </Card>
            <Card>
              <h3 className="mb-3 font-medium">Meses anteriores</h3>
              <SimpleTable headers={["Mês", "Faturamento", "Comissões", "Resultado"]} rows={data.previous_months.map((row) => [row.label, brl(row.net_amount), brl(row.commission_recognized), row.estimated_result === null ? "—" : brl(row.estimated_result)])} />
            </Card>
          </div>
        </>
      ) : <p className="text-sm text-muted">Carregando indicadores…</p>}
    </div>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="text-sm text-muted">Nenhum registro neste recorte.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-muted"><tr>{headers.map((header) => <th key={header} className="py-2 pr-3 font-medium">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-line">{row.map((cell, cellIndex) => <td key={cellIndex} className="py-2 pr-3">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
