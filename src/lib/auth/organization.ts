import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/types";

/**
 * Resultado do helper. `needsOnboarding = true` quando a organizacao existe
 * mas ainda nao tem `name` ou `type` preenchidos pelo usuario (caso recem-
 * criado).
 */
export interface OrganizationLookup {
  userId: string;
  organization: Organization | null;
  needsOnboarding: boolean;
}

/**
 * Busca a organizacao vinculada ao Clerk user atual. Nao redireciona —
 * use `requireOrganization()` quando a rota depender de organizacao completa.
 *
 * Usa o admin client (service role) porque ainda nao temos JWT third-party
 * configurado no Supabase. Isso e seguro porque o filtro by clerk_user_id
 * vem da sessao validada do Clerk.
 */
export async function getOrganization(): Promise<OrganizationLookup | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getOrganization]", error);
    throw error;
  }

  const organization = (data ?? null) as Organization | null;
  const needsOnboarding =
    !organization || !organization.name || !organization.type;

  return { userId, organization, needsOnboarding };
}

/**
 * Garante que existe uma organizacao COMPLETA (com name + type) para o
 * usuario. Caso contrario redireciona para /onboarding (ou /sign-in se nao
 * autenticado). Use em todas as rotas protegidas do dashboard.
 */
export async function requireOrganization(): Promise<{
  userId: string;
  organization: Organization;
}> {
  const lookup = await getOrganization();
  if (!lookup) redirect("/sign-in");

  if (lookup.needsOnboarding || !lookup.organization) {
    redirect("/onboarding");
  }

  return { userId: lookup.userId, organization: lookup.organization };
}

/**
 * Cria (ou retorna) um stub de organization para o Clerk user atual.
 * Usado pelo onboarding e pelo webhook do Clerk.
 *
 * Idempotente: se ja existir uma organizacao com `clerk_user_id`, retorna a
 * existente sem sobrescrever.
 */
export async function ensureOrganizationStub(): Promise<Organization> {
  const user = await currentUser();
  if (!user) {
    throw new Error("ensureOrganizationStub: sem usuario autenticado");
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_user_id", user.id)
    .maybeSingle();

  if (existing) return existing as Organization;

  const fallbackName =
    user.firstName?.trim() ||
    user.username ||
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Meu negócio";

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      clerk_user_id: user.id,
      name: fallbackName,
      plan: "basico",
      plan_status: "trialing",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[ensureOrganizationStub] insert", error);
    throw error;
  }

  return data as Organization;
}
