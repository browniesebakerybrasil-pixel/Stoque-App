import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Visão geral" };

interface KpiCard {
  label: string;
  value: string;
  hint?: string;
}

/**
 * Dashboard inicial. Mostra contadores agregados (materias, fichas, pedidos
 * de hoje) e um quickstart se o catalogo ainda esta vazio.
 */
export default async function DashboardPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const [{ count: rawCount }, { count: sheetCount }, { data: todayOrders }] =
    await Promise.all([
      supabase
        .from("raw_materials")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
      supabase
        .from("technical_sheets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
      supabase
        .from("orders")
        .select("net_amount, total_amount")
        .eq("organization_id", organization.id)
        .eq("order_date", new Date().toISOString().slice(0, 10)),
    ]);

  const grossToday = (todayOrders ?? []).reduce(
    (acc, o) => acc + Number(o.total_amount ?? 0),
    0,
  );
  const netToday = (todayOrders ?? []).reduce(
    (acc, o) => acc + Number(o.net_amount ?? 0),
    0,
  );

  const cards: KpiCard[] = [
    {
      label: "Matérias primas cadastradas",
      value: String(rawCount ?? 0),
      hint: "ingredientes na sua despensa virtual",
    },
    {
      label: "Fichas técnicas",
      value: String(sheetCount ?? 0),
      hint: "produtos com CMV calculado",
    },
    {
      label: "Vendas brutas hoje",
      value: formatCurrency(grossToday),
      hint: "antes das taxas de plataforma",
    },
    {
      label: "Líquido após taxas",
      value: formatCurrency(netToday),
      hint: "balcão + canais combinados",
    },
  ];

  const isEmpty = (rawCount ?? 0) === 0 && (sheetCount ?? 0) === 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-[var(--color-slate)]">Bem-vindo de volta</p>
        <h2 className="font-serif text-3xl text-[var(--color-navy)]">
          {organization.name}
        </h2>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <article
            key={c.label}
            className="rounded-lg border border-[var(--border)] bg-white p-5"
          >
            <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
              {c.label}
            </p>
            <p className="mt-2 font-serif text-3xl text-[var(--color-navy)]">
              {c.value}
            </p>
            {c.hint ? (
              <p className="mt-2 text-xs text-[var(--color-slate)]">{c.hint}</p>
            ) : null}
          </article>
        ))}
      </section>

      {isEmpty ? (
        <section className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--color-cream-50)] p-6">
          <h3 className="font-serif text-xl text-[var(--color-navy)]">
            Vamos pelo começo
          </h3>
          <p className="mt-2 text-sm text-[var(--color-slate)]">
            Cadastre suas matérias primas para o Stoque começar a calcular
            fichas técnicas e CMV automaticamente.
          </p>
          <Link
            href="/materias-primas"
            className="mt-4 inline-flex items-center rounded-md bg-[var(--color-brown)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brown-600)]"
          >
            Cadastrar primeira matéria prima
          </Link>
        </section>
      ) : null}
    </div>
  );
}
