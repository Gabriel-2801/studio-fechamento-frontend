"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", roles: ["admin", "operator", "collaborator"] },
  { href: "/lancamentos?criar=1", label: "Novo lançamento", roles: ["admin", "operator"] },
  { href: "/lancamentos", label: "Histórico", roles: ["admin", "operator", "collaborator"] },
  { href: "/procedimentos", label: "Procedimentos", roles: ["admin", "operator"] },
  { href: "/colaboradoras", label: "Colaboradoras", roles: ["admin", "operator"] },
  { href: "/comissoes", label: "Comissões", roles: ["admin", "collaborator"] },
  { href: "/despesas", label: "Despesas", roles: ["admin"] },
  { href: "/fechamento/diario", label: "Fechamento diário", roles: ["admin"] },
  { href: "/fechamento/mensal", label: "Fechamento mensal", roles: ["admin"] },
  { href: "/relatorios", label: "Relatórios", roles: ["admin"] },
  { href: "/configuracoes", label: "Configurações", roles: ["admin"] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const role = session?.user.role || "operator";
  const items = NAV.filter((item) => item.roles.includes(role)).map((item) =>
    item.href === "/lancamentos" && role === "collaborator" ? { ...item, label: "Meus atendimentos" } : item,
  );

  function leave() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#261e1b] text-[#f6efe9] transition md:static md:w-auto md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-5">
          <Link href="/" className="mb-8 flex flex-col items-center text-center" onClick={() => setOpen(false)}>
            <Logo size={132} className="shadow-sm" />
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#e7b7be]">Caixa interno</p>
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {items.map((item) => {
              const path = item.href.split("?")[0];
              const active = item.href.includes("?") ? false : path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`rounded-2xl px-3 py-2.5 text-sm ${active ? "bg-white/10 text-white" : "text-[#eadfd8] hover:bg-white/5"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 border-t border-white/10 pt-4 text-sm">
            <p className="font-medium">{session?.user.first_name || session?.user.username}</p>
            <p className="text-xs text-[#cbb8b0]">{session?.user.role === "admin" ? "Administradora" : session?.user.role === "operator" ? "Operadora" : "Colaboradora"}</p>
            <button className="mt-3 text-xs text-[#e7b7be]" onClick={leave} type="button">Sair</button>
          </div>
        </div>
      </aside>
      {open ? <button className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-label="Fechar menu" /> : null}
      <div className="min-w-0">
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <button className="rounded-full border border-line bg-white px-3 py-2 text-sm" onClick={() => setOpen(true)} type="button">Menu</button>
          <Logo size={44} />
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
