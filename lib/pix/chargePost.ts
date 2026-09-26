import { getAuthorization, baseUrl } from "./api";
import { z } from "zod";

export type ChargePostResponse = {
  chargeId: string;
  correlationId: string;
  brCode?: string;
  qrCodeImage?: string;
  paymentLinkUrl?: string;
  status?: string;
  value?: number;
};

export type ChargePostPayload = {
  correlationId: string;
  value: number; // Em centavos inteiros (ex: R$ 10,00 -> 1000)
  comment?: string;
  error?: string;
};

/**
 * Converte valor em reais (ex: 15.50) para centavos inteiros (ex: 1550),
 * conforme exigido pela API OpenPix.
 */
export function formatPixValueInCents(valueInReais: number): number {
  return Math.round(valueInReais * 100);
}

const chargeResponseSchema = z
  .object({
    charge: z.object({
      value: z.number(),
      comment: z.string().optional(),
      identifier: z.string(),
      correlationID: z.string(),
      transactionID: z.string().optional(),
      status: z.string(),
      customer: z.unknown().optional(),
      paymentLinkID: z.string().optional(),
      paymentLinkUrl: z.string().optional(),
      qrCodeImage: z.string().optional(),
      brCode: z.string().optional(),
      expiresIn: z.number().optional(),
      expiresDate: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    }),
    correlationID: z.string().optional(),
    brCode: z.string().optional(),
  })
  .catchall(z.unknown());

export const chargePost = async (
  payload: ChargePostPayload,
): Promise<ChargePostResponse> => {
  const token = getAuthorization();

  if (!token) {
    throw new Error("[chargePost] Token da PSP (AP_ID) não configurado.");
  }

  const response = await fetch(`${baseUrl}api/v1/charge`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[chargePost] PSP retornou erro:", response.status, errorBody);
    throw new Error(`Erro ao gerar cobrança PIX (HTTP ${response.status})`);
  }

  const data = await response.json();
  const parsed = chargeResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error("[chargePost] Resposta com formato inesperado da PSP:", parsed.error, data);
    const raw = data as Record<string, unknown>;
    const rawCharge = (raw.charge as Record<string, unknown>) || {};
    return {
      chargeId: String(rawCharge.identifier || raw.identifier || payload.correlationId),
      correlationId: String(raw.correlationID || payload.correlationId),
      brCode:
        typeof raw.brCode === "string"
          ? raw.brCode
          : typeof rawCharge.brCode === "string"
          ? rawCharge.brCode
          : undefined,
      qrCodeImage: typeof rawCharge.qrCodeImage === "string" ? rawCharge.qrCodeImage : undefined,
      paymentLinkUrl: typeof rawCharge.paymentLinkUrl === "string" ? rawCharge.paymentLinkUrl : undefined,
      status: typeof rawCharge.status === "string" ? rawCharge.status : undefined,
      value: typeof rawCharge.value === "number" ? rawCharge.value : undefined,
    };
  }

  return {
    chargeId: parsed.data.charge.identifier,
    correlationId: parsed.data.correlationID || parsed.data.charge.correlationID,
    brCode: parsed.data.brCode || parsed.data.charge.brCode,
    qrCodeImage: parsed.data.charge.qrCodeImage,
    paymentLinkUrl: parsed.data.charge.paymentLinkUrl,
    status: parsed.data.charge.status,
    value: parsed.data.charge.value,
  };
};
