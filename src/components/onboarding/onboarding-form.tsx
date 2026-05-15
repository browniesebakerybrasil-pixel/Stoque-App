"use client";

import { useActionState } from "react";
import {
  completeOnboarding,
  type OnboardingFormState,
} from "@/app/onboarding/actions";
import type { OrganizationType } from "@/types";

const TYPES: Array<{ value: OrganizationType; label: string; emoji: string }> =
  [
    { value: "hamburgueria", label: "Hamburgueria", emoji: "B" },
    { value: "confeitaria", label: "Confeitaria", emoji: "C" },
    { value: "lanchonete", label: "Lanchonete", emoji: "L" },
    { value: "restaurante", label: "Restaurante", emoji: "R" },
    { value: "delivery", label: "Delivery", emoji: "D" },
    { value: "outro", label: "Outro", emoji: "+" },
  ];

const initialState: OnboardingFormState = { error: null };

export function OnboardingForm({
  defaultName,
  defaultType,
}: {
  defaultName: string;
  defaultType: OrganizationType | null;
}) {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-[var(--color-navy)]"
        >
          Nome do negócio
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={defaultName}
          placeholder="Ex.: Burguer da Vila"
          className="mt-2 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 outline-none focus:border-[var(--color-navy)]"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-[var(--color-navy)]">
          Que tipo de negócio você toca?
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-white p-3 text-sm hover:border-[var(--color-navy)] has-[input:checked]:border-[var(--color-brown)] has-[input:checked]:bg-[var(--color-cream-50)]"
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                defaultChecked={defaultType === t.value}
                required
                className="accent-[var(--color-brown)]"
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[var(--color-brown)] px-6 py-3 font-medium text-white shadow-sm hover:bg-[var(--color-brown-600)] disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Começar a usar"}
        </button>
      </div>

      <p className="text-xs text-[var(--color-slate)]">
        Vamos criar para você os canais Balcão, WhatsApp e iFood. Edite depois
        em &quot;Canais&quot;.
      </p>
    </form>
  );
}
