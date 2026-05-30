import type { OrderStatus, PaymentStatus, PaymentMethod } from "@/types";

export const ORDER_COLUMNS: Array<{
  status: OrderStatus;
  label: string;
  hint: string;
}> = [
  { status: "novo", label: "Novo", hint: "acabou de chegar" },
  { status: "confirmado", label: "Confirmado", hint: "cliente confirmou" },
  { status: "em_producao", label: "Em produção", hint: "cozinha começou" },
  { status: "pronto", label: "Pronto", hint: "aguardando saída/retirada" },
  { status: "saiu", label: "Saiu para entrega", hint: "motoboy a caminho" },
  { status: "entregue", label: "Entregue", hint: "concluído" },
  { status: "cancelado", label: "Cancelado", hint: "" },
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  pronto: "Pronto",
  saiu: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  nao_pago: "Não pago",
  sinal_pago: "Sinal pago",
  pago: "Pago",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  vale: "Vale",
};

export const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  nao_pago: "bg-red-100 text-red-800 border-red-200",
  sinal_pago: "bg-amber-100 text-amber-800 border-amber-200",
  pago: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
