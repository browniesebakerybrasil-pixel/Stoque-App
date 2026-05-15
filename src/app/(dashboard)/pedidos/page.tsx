import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { OrderForm } from "@/components/pedidos/order-form";
import { DeleteOrderButton } from "@/components/pedidos/delete-order-button";
import { formatCurrency } from "@/lib/utils";
import type { Order, SalesChannel, TechnicalSheet } from "@/types";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: channels },
    { data: sheets },
    { data: orders },
  ] = await Promise.all([
    supabase
      .from("sales_channels")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("technical_sheets")
      .select("id, name, sale_price")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("orders")
      .select(
        "id, order_date, order_time, total_amount, net_amount, notes, channel:sales_channels(id, name, fee_percentage), items:order_items(id, product_name, quantity, unit_price, total_price)",
      )
      .eq("organization_id", organization.id)
      .eq("order_date", today)
      .order("order_time", { ascending: false }),
  ]);

  const channelList = (channels ?? []) as SalesChannel[];
  const sheetList = (sheets ?? []) as Pick<
    TechnicalSheet,
    "id" | "name" | "sale_price"
  >[];

  return (
    <div className="space-y-8">
      <CardHeader
        title="Pedidos"
        description={`Registro manual de pedidos do dia. Hoje: ${today}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Novo pedido
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Selecione o canal, escolha produtos e o líquido sai depois das taxas.
          </p>
          <div className="mt-4">
            {channelList.length === 0 ? (
              <p className="text-sm text-[var(--color-slate)]">
                Cadastre um canal de venda primeiro.
              </p>
            ) : null}
            <OrderForm channels={channelList} sheets={sheetList} />
          </div>
        </Card>

        <div>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Pedidos de hoje
          </h3>
          <div className="mt-3">
            {(orders ?? []).length === 0 ? (
              <EmptyState title="Nenhum pedido hoje" description="Use o formulário ao lado." />
            ) : (
              <OrderList orders={orders as unknown as OrderRow[]} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type OrderRow = Order & {
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  channel: { id: string; name: string; fee_percentage: number } | null;
};

function OrderList({ orders }: { orders: OrderRow[] }) {
  return (
    <DataTable>
      <THead>
        <TR>
          <TH>Hora</TH>
          <TH>Canal</TH>
          <TH>Itens</TH>
          <TH>Bruto</TH>
          <TH>Líquido</TH>
          <TH className="text-right">Ação</TH>
        </TR>
      </THead>
      <tbody>
        {orders.map((o) => (
          <TR key={o.id}>
            <TD className="whitespace-nowrap text-xs text-[var(--color-slate)]">
              {new Date(o.order_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </TD>
            <TD>{o.channel?.name ?? "-"}</TD>
            <TD>
              <ul className="text-xs text-[var(--color-slate)]">
                {o.items.map((it) => (
                  <li key={it.id}>{it.quantity}x {it.product_name}</li>
                ))}
              </ul>
            </TD>
            <TD>{formatCurrency(Number(o.total_amount))}</TD>
            <TD className="font-medium text-[var(--color-navy)]">
              {formatCurrency(Number(o.net_amount))}
            </TD>
            <TD className="text-right"><DeleteOrderButton id={o.id} /></TD>
          </TR>
        ))}
      </tbody>
    </DataTable>
  );
}
