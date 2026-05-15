"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureOrganizationStub } from "@/lib/auth/organization";
import type { OrganizationType } from "@/types";

const ALLOWED_TYPES: OrganizationType[] = [
  "hamburgueria",
  "confeitaria",
  "lanchonete",
  "restaurante",
  "delivery",
  "outro",
];

const DEFAULT_CHANNELS = [
  { name: "Balcao", fee: 0 },
  { name: "WhatsApp", fee: 0 },
  { name: "iFood", fee: 23 },
];

export interface OnboardingFormState {
  error: string | null;
}

/**
 * Server Action chamada pelo formulario de onboarding.
 *
 * 1. Garante a organizacao do usuario (cria stub se necessario).
 * 2. Atualiza nome e tipo do negocio.
 * 3. Cria os canais de venda padrao (idempotente: nao duplica).
 * 4. Redireciona para /dashboard.
 *
 * Retorna estado para `useFormState` em caso de erro de validacao.
 */
export async function completeOnboarding(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const { userId } = await auth();
  if (!userId) return { error: "Sessão expirada. Entre novamente." };

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim() as OrganizationType;

  if (!name) return { error: "Informe o nome do negócio." };
  if (name.length > 80) return { error: "Nome com mais de 80 caracteres." };
  if (!ALLOWED_TYPES.includes(type)) {
    return { error: "Selecione um tipo de negócio válido." };
  }

  const org = await ensureOrganizationStub();
  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ name, type })
    .eq("id", org.id);

  if (updateError) {
    console.error("[completeOnboarding] update org", updateError);
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  // Cria canais padrao apenas se ainda nao existir nenhum.
  const { count } = await supabase
    .from("sales_channels")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id);

  if ((count ?? 0) === 0) {
    const { error: channelsError } = await supabase
      .from("sales_channels")
      .insert(
        DEFAULT_CHANNELS.map((c) => ({
          organization_id: org.id,
          name: c.name,
          fee_percentage: c.fee,
          is_active: true,
        })),
      );
    if (channelsError) {
      console.error("[completeOnboarding] insert channels", channelsError);
      // Nao bloqueia o onboarding por causa dos canais — log e segue.
    }
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
