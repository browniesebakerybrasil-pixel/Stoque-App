"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import {
  applyFilters,
  defaultFilters,
  OrderFilters,
  type FiltersState,
} from "./order-filters";
import { OrderCard } from "./order-card";
import { OrderDetailModal } from "./order-detail-modal";
import { ORDER_COLUMNS } from "./order-constants";
import {
  updateOrderPayment,
  updateOrderStatus,
} from "@/app/(dashboard)/pedidos/actions";
import type { OrderStatus, SalesChannel } from "@/types";
import type { KanbanOrder } from "./types";

interface Props {
  orders: KanbanOrder[];
  channels: SalesChannel[];
}

export function OrderKanban({ orders, channels }: Props) {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [openId, setOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<OrderStatus | null>(null);

  const filtered = useMemo(
    () => applyFilters(orders, filters),
    [orders, filters],
  );

  const byStatus = useMemo(() => {
    const map: Record<OrderStatus, KanbanOrder[]> = {
      novo: [],
      confirmado: [],
      em_producao: [],
      pronto: [],
      saiu: [],
      entregue: [],
      cancelado: [],
    };
    for (const o of filtered) map[o.order_status].push(o);
    return map;
  }, [filtered]);

  const opened = useMemo(
    () => orders.find((o) => o.id === openId) ?? null,
    [orders, openId],
  );

  function moveOrder(id: string, target: OrderStatus) {
    const cur = orders.find((o) => o.id === id);
    if (!cur || cur.order_status === target) return;
    startTransition(() => {
      void updateOrderStatus(id, target).catch(() => undefined);
    });
  }

  function markPaid(id: string) {
    startTransition(() => {
      void updateOrderPayment(id, "pago").catch(() => undefined);
    });
  }

  return (
    <div className="space-y-4">
      <OrderFilters
        value={filters}
        onChange={setFilters}
        channels={channels}
      />

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-fit gap-3">
          {ORDER_COLUMNS.map((col) => (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOver !== col.status) setDragOver(col.status);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setDragOver(null);
                if (id) moveOrder(id, col.status);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border bg-[var(--color-cream-50)] p-3 transition-colors",
                dragOver === col.status
                  ? "border-[var(--color-brown)] bg-[var(--color-cream)]"
                  : "border-[var(--border)]",
              )}
            >
              <header className="mb-3">
                <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
                  {col.label}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--color-navy)]">
                  {byStatus[col.status].length} pedido
                  {byStatus[col.status].length === 1 ? "" : "s"}
                </p>
              </header>

              <div className="flex flex-1 flex-col gap-2">
                {byStatus[col.status].map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onOpen={setOpenId}
                    onMarkPaid={markPaid}
                  />
                ))}
                {byStatus[col.status].length === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--border)] p-3 text-center text-xs text-[var(--color-slate)]">
                    —
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <OrderDetailModal order={opened} onClose={() => setOpenId(null)} />
    </div>
  );
}
