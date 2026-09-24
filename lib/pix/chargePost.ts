import { getAuthorization, baseUrl } from "./api";
import { z } from "zod";

const url = "api/v1/charge";

const getUrl = () => `${baseUrl}${url}`;

export type ChargePostResponse = {
  chargeId: string;
  correlationId: string;
  brCode?: string;
};

export type ChargePostPayload = {
  correlationId: string;
  value: number;
  comment?: string;
  error?: string;
};

const chargeResponseSchema = z.object({
  charge: z.object({
    value: z.number(),
    comment: z.string().optional(),
    identifier: z.string(),
    correlationID: z.string(),
    transactionID: z.string().optional(),
    status: z.string(),
    customer: z.any().optional(),
    paymentLinkID: z.string().optional(),
    paymentLinkUrl: z.string().optional(),
    qrCodeImage: z.string().optional(),
    brCode: z.string(),
    expiresIn: z.number().optional(),
    expiresDate: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  correlationID: z.string(),
  brCode: z.string(),
}).catchall(z.any());

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
    console.error("[chargePost] Resposta inválida da PSP:", data);
    // Retornamos os dados de qualquer forma (com cast) para não quebrar a UI
    // mas logamos o erro de contrato. O ideal seria throw error, mas como a PSP
    // pode adicionar/remover campos, mantemos flexível por enquanto.
    return data as ChargePostResponse;
  }

  return parsed.data as unknown as ChargePostResponse;
};
