"use client";

import { cn, formatCurrency } from "@/lib/utils";
import {
  PAYMENT_BADGE,
  PAYMENT_STATUS_LABEL,
} from "./order-constants";
import type { KanbanOrder } from "./types";

interface Props {
  order: KanbanOrder;
  onOpen: (id: string) => void;
  onDragStart?: (id: string) => void;
  onMarkPaid: (id: string) => void;
}

/**
 * Card de pedido usado dentro de cada coluna do Kanban.
 *
 * Bindings:
 *  - draggable=true em desktop (pointer drag) — no mobile o usuário
 *    abre o modal pra mudar status.
 *  - clique abre o modal de detalhes.
 *  - botão "Marcar pago" não propaga clique pro card.
 */
export function OrderCard({
  order,
  onOpen,
  onDragStart,
  onMarkPaid,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const lateDelivery =
    order.delivery_date != null && order.delivery_date <= today;

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", order.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(order.id);
      }}
      onClick={() => onOpen(order.id)}
      className="group cursor-pointer rounded-md border border-[var(--border)] bg-white p-3 shadow-sm transition-colors hover:border-[var(--color-navy)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-[var(--color-slate)]">
            #{String(order.order_number).padStart(3, "0")}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--color-navy)]">
            {order.customer_name ?? order.customer?.name ?? "Sem cliente"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider",
            PAYMENT_BADGE[order.payment_status],
          )}
          title={PAYMENT_STATUS_LABEL[order.payment_status]}
        >
          {order.payment_status === "nao_pago"
            ? "não pago"
            : order.payment_status === "sinal_pago"
              ? "sinal"
              : "pago"}
        </span>
      </div>

      <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-slate)]">
        {order.items.slice(0, 3).map((it) => (
          <li key={it.id} className="truncate">
            {it.quantity}× {it.product_name}
          </li>
        ))}
        {order.items.length > 3 ? (
          <li className="italic">+{order.items.length - 3} item(ns)</li>
        ) : null}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--color-slate)]">
          <span title={order.delivery_type === "entrega" ? "Entrega" : "Retirada"}>
            {order.delivery_type === "entrega" ? "→ entrega" : "↑ retirada"}
          </span>
          {order.delivery_date ? (
            <span
              className={cn(
                "rounded px-1.5 py-0.5",
                lateDelivery
                  ? "bg-red-100 text-red-800"
                  : "bg-[var(--color-cream-50)] text-[var(--color-slate)]",
              )}
            >
              {formatDateShort(order.delivery_date)}
            </span>
          ) : null}
        </div>
        <span className="font-medium text-[var(--color-navy)]">
          {formatCurrency(Number(order.total_amount))}
        </span>
      </div>

      {order.payment_status !== "pago" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkPaid(order.id);
          }}
          className="mt-2 w-full rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 opacity-0 transition-opacity hover:bg-emerald-100 group-hover:opacity-100"
        >
          Marcar como pago
        </button>
      ) : null}
    </article>
  );
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
