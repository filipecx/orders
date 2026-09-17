"use server";

import { headers } from "next/headers";
import {
  checkoutFormSchema,
  type CheckoutFormInput,
} from "@/lib/domain/orders";
import { createOrder } from "@/lib/db/orders";

export type CheckoutActionResult = {
  success: boolean;
  message: string;
  orderId?: string;
  errors?: Record<string, string[]>;
};

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.timestamp > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_REQUESTS;
}

export async function createOrderAction(
  formData: CheckoutFormInput,
): Promise<CheckoutActionResult> {
  const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";
  
  if (!checkRateLimit(ip)) {
    return {
      success: false,
      message: "Muitos pedidos realizados recentemente. Tente novamente em alguns minutos.",
    };
  }

  const validationResult = checkoutFormSchema.safeParse(formData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Por favor, preencha todos os campos obrigatórios corretamente.",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  try {
    const order = await createOrder(validationResult.data);

    return {
      success: true,
      message: "Pedido realizado com sucesso!",
      orderId: order.id,
    };
  } catch (error) {
    console.error("[createOrderAction] Erro ao criar pedido:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar seu pedido. Tente novamente.",
    };
  }
}
