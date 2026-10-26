export type Role = "admin" | "operator" | "collaborator";

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  collaborator: number | null;
  collaborator_name?: string | null;
  is_active: boolean;
};

export type Session = {
  user: User;
  studio_name: string;
  disclaimer: string;
  commission_policy: string;
  commission_policy_description: string;
  commission_precedence: string;
  require_price_change_justification: boolean;
};

export type Option = { value: string; label: string; description?: string };

export type Meta = {
  disclaimer: string;
  formula: string;
  commission_precedence: string;
  payment_methods: Option[];
  expense_categories: Option[];
  roles: Option[];
  commission_policies: Option[];
  payment_statuses: Option[];
};

export type Procedure = {
  id: number;
  name: string;
  description: string;
  category: string;
  default_price: string;
  specific_commission_percent: string | null;
  is_active: boolean;
};

export type Collaborator = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  admission_date: string;
  default_commission_percent: string;
  is_active: boolean;
  notes: string;
};

export type EntryItem = {
  id: number;
  collaborator_id: number;
  collaborator_name: string;
  procedure_id: number;
  procedure_name: string;
  quantity: number;
  catalog_unit_price: string;
  gross_amount: string;
  discount_amount: string;
  final_amount: string;
  justification: string;
  commission_percent: string;
  commission_rule_label: string;
  commission_id: number;
  commission_generated: string;
  commission_recognized: string;
  commission_paid: string;
  commission_pending: string;
  commission_status: string;
  commission_adjusted: boolean;
};

export type Entry = {
  id: number;
  service_date: string;
  status: string;
  notes: string;
  payment_status: string | null;
  gross_amount: string;
  discount_amount: string;
  final_amount: string;
  commission_generated: string;
  commission_recognized: string;
  studio_amount: string;
  received_amount: string | null;
  pending_amount: string | null;
  redacted: boolean;
  cancellation_reason: string;
  items: EntryItem[];
  payments: { id: number; method: string; method_label: string; amount: string; notes: string }[];
  audit?: { id: number; action: string; description: string; created_at: string; user: string }[];
};

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };

export type PeriodSummary = {
  entry_count: number;
  procedure_count: number;
  gross_amount: string;
  discount_amount: string;
  net_amount: string;
  received_amount: string;
  pending_amount: string;
  commission_generated: string;
  commission_recognized: string;
  commission_paid: string;
  commission_pending: string;
  studio_amount: string;
  expenses_registered: string | null;
  expenses_paid: string | null;
  expenses_pending: string | null;
  estimated_result: string | null;
  result_explanation: string;
  policy_note: string;
  closing_status?: string;
  commission_payments_total?: string;
  by_payment_method: { method: string; label: string; amount: string }[];
  by_collaborator: { collaborator_id: number; name: string; procedure_count: number; net: string; generated: string; recognized: string; paid: string; pending: string }[];
  top_procedures: { procedure_id: number; name: string; quantity: number; net: string }[];
  warnings?: string[];
  hard_inconsistencies?: string[];
  expenses?: { id: number; date: string; category_label: string; description: string; amount: string; payment_status: string }[];
  commission_payments?: { total: string; items: { id: number; payment_date: string; collaborator_name: string; amount: string; voided: boolean; notes: string }[] };
  adjustments?: { id: number; kind_label: string; amount: string; reason: string; created_by: string }[];
  entries?: { id: number; service_date: string; final_amount: string; received_amount: string; payment_status: string; collaborators: string }[];
  label?: string;
  formula?: string;
  disclaimer?: string;
  document_status?: string;
  year?: number;
  month?: number;
};

export type Dashboard = {
  scope: "studio" | "collaborator";
  disclaimer: string;
  formula: string;
  reference_date: string;
  day: PeriodSummary;
  month: PeriodSummary;
  top_procedures: PeriodSummary["top_procedures"];
  by_collaborator: PeriodSummary["by_collaborator"];
  by_payment_method: PeriodSummary["by_payment_method"];
  previous_months: { label: string; net_amount: string; commission_recognized: string; estimated_result: string | null }[];
};
