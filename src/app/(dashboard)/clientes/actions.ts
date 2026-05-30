"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  customerSchema,
  emptyActionState,
  parseFormData,
  type ActionState,
} from "@/lib/validation";

export const initialCustomerState: ActionState = emptyActionState();

const LOYALTY_THRESHOLD = 10;

/**
 * Cria um novo cliente. Após salvar redireciona para o perfil.
 */
export async function createCustomer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(customerSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: organization.id, ...parsed.data })
    .select("id")
    .single();
  if (error) {
    console.error("[createCustomer]", error);
    return { ok: false, error: "Erro ao salvar cliente." };
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = parseFormData(customerSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("[updateCustomer]", error);
    return { ok: false, error: "Erro ao atualizar." };
  }
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}

/**
 * Marca o "mimo de fidelidade" como entregue na data informada (ou hoje).
 * Quando o cliente atinge 10 pedidos a UI sugere registrar o mimo.
 */
export async function markLoyaltyGift(id: string, date?: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  const ref = date ?? new Date().toISOString().slice(0, 10);
  await supabase
    .from("customers")
    .update({ loyalty_gift_given: true, loyalty_gift_date: ref })
    .eq("id", id);
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

export async function resetLoyaltyGift(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase
    .from("customers")
    .update({ loyalty_gift_given: false, loyalty_gift_date: null })
    .eq("id", id);
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

/**
 * Incrementa o contador de pedidos do cliente. Chamado pela action de
 * criar pedido. Evita race conditions usando RPC simples (read-modify-write
 * no admin client é aceitável pelo baixo concurrent volume de cada org).
 */
export async function bumpCustomerOrderCount(customerId: string) {
  const supabase = createAdminClient();
  const { data: cur } = await supabase
    .from("customers")
    .select("order_count")
    .eq("id", customerId)
    .maybeSingle();
  const next = (Number(cur?.order_count) || 0) + 1;
  await supabase
    .from("customers")
    .update({ order_count: next })
    .eq("id", customerId);
}

export { LOYALTY_THRESHOLD };
