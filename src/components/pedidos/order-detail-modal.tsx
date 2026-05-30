"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { updateOrderFromModal } from "@/app/(dashboard)/pedidos/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import {
  ORDER_COLUMNS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "./order-constants";
import type { KanbanOrder } from "./types";

export function OrderDetailModal({
  order,
  onClose,
}: {
  order: KanbanOrder | null;
  onClose: () => void;
}) {
  const isOpen = order != null;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!order) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-white sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalBody order={order} onClose={onClose} />
      </div>
    </div>
  );
}

function ModalBody({
  order,
  onClose,
}: {
  order: KanbanOrder;
  onClose: () => void;
}) {
  const action = updateOrderFromModal.bind(null, order.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  const balance = Number(order.total_amount) - Number(order.amount_paid);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-[var(--color-slate)]">
            #{String(order.order_number).padStart(3, "0")}
          </p>
          <h2 className="font-serif text-2xl text-[var(--color-navy)]">
            {order.customer_name ?? order.customer?.name ?? "Sem cliente"}
          </h2>
          {order.customer?.whatsapp ? (
            <p className="text-sm text-[var(--color-slate)]">
              {order.customer.whatsapp}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="text-2xl text-[var(--color-slate)] hover:text-[var(--color-navy)]"
        >
          ×
        </button>
      </header>

      <section className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--color-cream-50)] p-4 sm:grid-cols-3">
        <Stat label="Total" value={formatCurrency(Number(order.total_amount))} />
        <Stat label="Pago" value={formatCurrency(Number(order.amount_paid))} />
        <Stat
          label="Saldo"
          value={formatCurrency(balance)}
          emphasize={balance > 0}
        />
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Itens
        </h3>
        <ul className="mt-2 divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>
                {it.quantity}× {it.product_name}
              </span>
              <span className="text-[var(--color-slate)]">
                {formatCurrency(Number(it.total_price))}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <form action={formAction} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="order_status">Status do pedido</Label>
            <Select
              id="order_status"
              name="order_status"
              defaultValue={order.order_status}
            >
              {ORDER_COLUMNS.map((c) => (
                <option key={c.status} value={c.status}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="payment_status">Pagamento</Label>
            <Select
              id="payment_status"
              name="payment_status"
              defaultValue={order.payment_status}
            >
              {(["nao_pago", "sinal_pago", "pago"] as const).map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_STATUS_LABEL[p]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="payment_method">Forma de pagamento</Label>
            <Select
              id="payment_method"
              name="payment_method"
              defaultValue={order.payment_method}
            >
              {(["pix", "credito", "debito", "dinheiro", "vale"] as const).map(
                (p) => (
                  <option key={p} value={p}>
                    {PAYMENT_METHOD_LABEL[p]}
                  </option>
                ),
              )}
            </Select>
          </div>
          <div>
            <Label htmlFor="amount_paid" hint="ignorado quando 'pago' / 'não pago'">
              Valor já pago
            </Label>
            <Input
              id="amount_paid"
              name="amount_paid"
              inputMode="decimal"
              defaultValue={String(order.amount_paid)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="delivery_date">Data de entrega</Label>
            <Input
              id="delivery_date"
              name="delivery_date"
              type="date"
              defaultValue={order.delivery_date ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="delivery_type">Tipo de entrega</Label>
            <Select
              id="delivery_type"
              name="delivery_type"
              defaultValue={order.delivery_type}
            >
              <option value="retirada">Retirada</option>
              <option value="entrega">Entrega</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="delivery_address">Endereço de entrega</Label>
          <Input
            id="delivery_address"
            name="delivery_address"
            defaultValue={order.delivery_address ?? ""}
            placeholder="Rua, número, bairro"
          />
        </div>

        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={order.notes ?? ""}
          />
        </div>

        {state.error ? (
          <p className="text-sm text-red-700">{state.error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {label}
      </p>
      <p
        className={
          emphasize
            ? "mt-1 font-serif text-2xl text-red-700"
            : "mt-1 font-serif text-2xl text-[var(--color-navy)]"
        }
      >
        {value}
      </p>
    </div>
  );
}
