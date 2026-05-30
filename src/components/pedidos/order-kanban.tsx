"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  applyFilters,
  defaultFilters,
  OrderFilters,
  type FiltersState,
} from "./order-filters";
import { OrderCard } from "./order-card";
import { OrderDetailModal } from "./order-detail-modal";
import { ORDER_COLUMNS, ORDER_STATUS_COLOR } from "./order-constants";
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

// Distância mínima em pixels que o dedo precisa percorrer para começar a
// arrastar (evita iniciar drag por engano em um tap normal).
const TOUCH_DRAG_THRESHOLD = 12;

export function OrderKanban({ orders, channels }: Props) {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [openId, setOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [dragOverColumn, setDragOverColumn] = useState<OrderStatus | null>(
    null,
  );

  // ---------------------------------------------------------------------------
  // Touch drag (iPad / mobile)
  // ---------------------------------------------------------------------------
  type TouchState = {
    id: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    rect: { width: number; height: number };
  };
  const [touchDrag, setTouchDrag] = useState<TouchState | null>(null);
  const touchDragRef = useRef<TouchState | null>(null);
  touchDragRef.current = touchDrag;

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

  // ---------- Touch handlers ----------
  function handleTouchStart(e: React.TouchEvent, id: string) {
    const t = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setTouchDrag({
      id,
      startX: t.clientX,
      startY: t.clientY,
      currentX: t.clientX,
      currentY: t.clientY,
      isDragging: false,
      rect: { width: rect.width, height: rect.height },
    });
  }

  useEffect(() => {
    if (!touchDrag) return;

    function onMove(e: TouchEvent) {
      const cur = touchDragRef.current;
      if (!cur) return;
      const t = e.touches[0];
      const dx = t.clientX - cur.startX;
      const dy = t.clientY - cur.startY;
      const started =
        cur.isDragging || Math.hypot(dx, dy) > TOUCH_DRAG_THRESHOLD;

      if (started) {
        e.preventDefault();
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const colEl = el?.closest("[data-column-status]");
        const status = (colEl?.getAttribute("data-column-status") ?? null) as
          | OrderStatus
          | null;
        setDragOverColumn(status);
        setTouchDrag({
          ...cur,
          currentX: t.clientX,
          currentY: t.clientY,
          isDragging: true,
        });
      }
    }

    function onEnd(e: TouchEvent) {
      const cur = touchDragRef.current;
      if (!cur) return;
      if (cur.isDragging) {
        const t = e.changedTouches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const colEl = el?.closest("[data-column-status]");
        const status = colEl?.getAttribute("data-column-status") as
          | OrderStatus
          | null;
        if (status) moveOrder(cur.id, status);
      } else {
        // Não saiu do threshold → tratar como tap: abre modal.
        setOpenId(cur.id);
      }
      setTouchDrag(null);
      setDragOverColumn(null);
    }

    function onCancel() {
      setTouchDrag(null);
      setDragOverColumn(null);
    }

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onCancel);
    return () => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touchDrag !== null]);

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      <OrderFilters
        value={filters}
        onChange={setFilters}
        channels={channels}
      />

      <div
        className="-mx-4 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollBehavior: "smooth",
        }}
      >
        <div className="flex min-w-fit gap-3">
          {ORDER_COLUMNS.map((col) => {
            const color = ORDER_STATUS_COLOR[col.status];
            const isTarget = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                data-column-status={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== col.status) {
                    setDragOverColumn(col.status);
                  }
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  setDragOverColumn(null);
                  if (id) moveOrder(id, col.status);
                }}
                className={
                  "flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all" +
                  (isTarget
                    ? " ring-2 ring-offset-1"
                    : " border-[var(--border)]")
                }
                style={
                  isTarget
                    ? {
                        borderColor: color,
                        boxShadow: `0 0 0 2px ${color}33`,
                      }
                    : undefined
                }
              >
                {/* barra superior colorida */}
                <div className="h-1" style={{ backgroundColor: color }} />

                <header className="border-b border-[var(--border)] bg-white px-3 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className="text-base font-semibold leading-tight"
                      style={{ color }}
                    >
                      {col.label}
                    </h3>
                    <span
                      className="rounded-full bg-[var(--color-cream-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-slate)]"
                    >
                      {byStatus[col.status].length}
                    </span>
                  </div>
                  {col.hint ? (
                    <p className="mt-0.5 text-[11px] text-[var(--color-slate)]">
                      {col.hint}
                    </p>
                  ) : null}
                </header>

                <div className="flex flex-1 flex-col gap-2 bg-[var(--color-cream-50)] p-2">
                  {byStatus[col.status].map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      onOpen={setOpenId}
                      onMarkPaid={markPaid}
                      onTouchStart={handleTouchStart}
                      isDragging={touchDrag?.id === o.id && touchDrag.isDragging}
                    />
                  ))}
                  {byStatus[col.status].length === 0 ? (
                    <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-3 text-center text-xs text-[var(--color-slate)]">
                      —
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ghost que segue o dedo durante o drag touch */}
      {touchDrag?.isDragging ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-md border-2 border-[var(--color-brown)] bg-white p-3 shadow-xl"
          style={{
            left: touchDrag.currentX - touchDrag.rect.width / 2,
            top: touchDrag.currentY - 24,
            width: touchDrag.rect.width,
            opacity: 0.95,
          }}
        >
          <p className="text-xs font-medium text-[var(--color-navy)]">
            arrastando…
          </p>
        </div>
      ) : null}

      <OrderDetailModal order={opened} onClose={() => setOpenId(null)} />
    </div>
  );
}
