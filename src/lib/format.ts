export function brl(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "R$ 0,00";
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "R$ 0,00";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function pct(value: string | number) {
  const number = typeof value === "number" ? value : Number(value);
  return `${number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function brDate(iso?: string | null) {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function brDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function monthStart(iso = todayIso()) {
  return `${iso.slice(0, 7)}-01`;
}

export function toAmount(value: string) {
  const cleaned = value.trim().replace(/\s/g, "");
  if (!cleaned) return "";
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return "";
  return number.toFixed(2);
}

export function amount(value: string) {
  const parsed = toAmount(value || "0");
  return parsed ? Number(parsed) : 0;
}

export const PAYMENT_STATUS: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcialmente pago",
  paid: "Pago",
};

export const COMMISSION_STATUS: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcialmente paga",
  paid: "Paga",
  reversed: "Estornada",
};

export const CLOSING_STATUS: Record<string, string> = {
  open: "Aberto",
  closed: "Fechado",
  reopened: "Reaberto",
};
