"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  numberFromInput,
  type ActionState,
} from "@/lib/validation";
import { calcOrderTotals } from "@/lib/utils";
import type { SalesChannel } from "@/types";

/**
 * Schema customizado para o formulario de pedido. Os itens chegam como linhas
 * indexadas (`items.0.product_name`, `items.0.quantity`, etc.). Usamos a mesma
 * convencao do react-hook-form embora tenhamos optado por Server Actions.
 */
const orderFormSchema = z.object({
  sales_channel_id: z.string().uuid().optional().or(z.literal("")),
  order_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const orderItemFormSchema = z.object({
  technical_sheet_id: z.string().uuid().optional().or(z.literal("")),
  product_name: z.string().min(1, "Nome obrigatório."),
  quantity: numberFromInput.refine(
    (n) => Number.isFinite(n) && Number.isInteger(n) && n > 0,
    { message: "Quantidade > 0." },
  ),
  unit_price: numberFromInput.refine((n) => n >= 0, {
    message: "Preço inválido.",
  }),
});

export async function createOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();

  const baseParse = orderFormSchema.safeParse({
    sales_channel_id: formData.get("sales_channel_id") ?? "",
    order_date: formData.get("order_date") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!baseParse.success) {
    return { ok: false, error: "Dados do pedido inválidos." };
  }

  // Coleta as linhas de items (form usa items[0][product_name], etc.)
  const itemRows = collectItems(formData);
  if (itemRows.length === 0) {
    return { ok: false, error: "Adicione ao menos um item." };
  }

  const items: Array<{
    technical_sheet_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }> = [];
  for (const row of itemRows) {
    const parsed = orderItemFormSchema.safeParse(row);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Item inválido: ${parsed.error.issues[0]?.message ?? "verifique"}.`,
      };
    }
    items.push({
      technical_sheet_id: parsed.data.technical_sheet_id || null,
      product_name: parsed.data.product_name,
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price,
    });
  }

  const supabase = createAdminClient();

  // Busca taxa do canal escolhido para calcular liquido
  let feePct = 0;
  const channelId = baseParse.data.sales_channel_id || null;
  if (channelId) {
    const { data: channel } = await supabase
      .from("sales_channels")
      .select("fee_percentage")
      .eq("id", channelId)
      .maybeSingle();
    feePct = Number((channel as Pick<SalesChannel, "fee_percentage"> | null)?.fee_percentage ?? 0);
  }

  const { grossAmount, netAmount } = calcOrderTotals(
    items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price })),
    feePct,
  );

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      organization_id: organization.id,
      sales_channel_id: channelId,
      order_date: baseParse.data.order_date || new Date().toISOString().slice(0, 10),
      notes: baseParse.data.notes || null,
      total_amount: round2(grossAmount),
      net_amount: round2(netAmount),
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    console.error("[createOrder]", orderErr);
    return { ok: false, error: "Erro ao salvar pedido." };
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      technical_sheet_id: i.technical_sheet_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
  );
  if (itemsErr) {
    console.error("[createOrder items]", itemsErr);
    // Limpa o pedido para nao deixar orfao
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Erro ao salvar itens." };
  }

  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  redirect("/pedidos");
}

export async function deleteOrder(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("orders").delete().eq("id", id);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------

function collectItems(
  formData: FormData,
): Array<Record<string, FormDataEntryValue>> {
  const map = new Map<number, Record<string, FormDataEntryValue>>();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.([a-z_]+)$/.exec(key);
    if (!match) continue;
    const idx = Number(match[1]);
    const field = match[2];
    if (!map.has(idx)) map.set(idx, {});
    map.get(idx)![field] = value;
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row)
    .filter((row) => String(row.product_name ?? "").trim() !== "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
