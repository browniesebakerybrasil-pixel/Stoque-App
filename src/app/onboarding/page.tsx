import { getOrganization } from "@/lib/auth/organization";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata = { title: "Bem-vindo" };

export default async function OnboardingPage() {
  const lookup = await getOrganization();
  if (!lookup) redirect("/sign-in");

  // Se ja completou onboarding, vai direto para o dashboard.
  if (!lookup.needsOnboarding && lookup.organization) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-widest text-[var(--color-brown)]">
          último passo
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--color-navy)]">
          Vamos configurar o seu Stoque.
        </h1>
        <p className="mt-3 text-[var(--color-slate)]">
          Conte rapidamente sobre o seu negócio. Você pode mudar tudo isso
          depois nas configurações.
        </p>
      </div>
      <OnboardingForm
        defaultName={lookup.organization?.name ?? ""}
        defaultType={lookup.organization?.type ?? null}
      />
    </div>
  );
}
