import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { chargePost, formatPixValueInCents, type ChargePostPayload } from "../chargePost";
import * as apiModule from "../api";

describe("OpenPix PIX Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("formatPixValueInCents", () => {
    it("deve converter valores em reais para centavos inteiros com precisão", () => {
      expect(formatPixValueInCents(10)).toBe(1000);
      expect(formatPixValueInCents(15.5)).toBe(1550);
      expect(formatPixValueInCents(0.99)).toBe(99);
      expect(formatPixValueInCents(124.9)).toBe(12490);
    });

    it("deve arredondar dízimas ou frações de centavo adequadamente", () => {
      expect(formatPixValueInCents(10.505)).toBe(1051);
    });
  });

  describe("chargePost", () => {
    it("deve lançar erro se o token da PSP (AP_ID) não estiver configurado", async () => {
      vi.spyOn(apiModule, "getAuthorization").mockReturnValue(undefined);

      const payload: ChargePostPayload = {
        correlationId: "order-test-123",
        value: 1550,
      };

      await expect(chargePost(payload)).rejects.toThrow(
        "[chargePost] Token da PSP (AP_ID) não configurado."
      );
    });

    it("deve enviar requisição POST correta com headers e body para a OpenPix", async () => {
      vi.spyOn(apiModule, "getAuthorization").mockReturnValue("test-app-id-token");

      const mockResponseData = {
        charge: {
          identifier: "charge-uuid-001",
          correlationID: "order-uuid-999",
          value: 2500,
          comment: "Pedido #1001",
          status: "ACTIVE",
          brCode: "00020126580014br.gov.bcb.pix0136test",
          qrCodeImage: "https://api.openpix.com.br/qr/charge-uuid-001.png",
          paymentLinkUrl: "https://openpix.com.br/pay/charge-uuid-001",
        },
        correlationID: "order-uuid-999",
        brCode: "00020126580014br.gov.bcb.pix0136test",
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      });
      global.fetch = fetchMock;

      const payload: ChargePostPayload = {
        correlationId: "order-uuid-999",
        value: 2500,
        comment: "Pedido #1001",
      };

      const result = await chargePost(payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];

      expect(url).toContain("api/v1/charge");
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "test-app-id-token",
      });
      expect(JSON.parse(options.body)).toEqual(payload);

      expect(result).toEqual({
        chargeId: "charge-uuid-001",
        correlationId: "order-uuid-999",
        brCode: "00020126580014br.gov.bcb.pix0136test",
        qrCodeImage: "https://api.openpix.com.br/qr/charge-uuid-001.png",
        paymentLinkUrl: "https://openpix.com.br/pay/charge-uuid-001",
        status: "ACTIVE",
        value: 2500,
      });
    });

    it("deve lançar erro descritivo quando a PSP retornar status HTTP de erro (ex: 401 ou 400)", async () => {
      vi.spyOn(apiModule, "getAuthorization").mockReturnValue("invalid-token");

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized: Invalid App ID",
      });

      const payload: ChargePostPayload = {
        correlationId: "order-123",
        value: 1000,
      };

      await expect(chargePost(payload)).rejects.toThrow(
        "Erro ao gerar cobrança PIX (HTTP 401)"
      );
    });

    it("deve fazer fallback tolerante se a PSP retornar campos adicionais ou contrato inesperado", async () => {
      vi.spyOn(apiModule, "getAuthorization").mockReturnValue("test-token");

      const unexpectedResponse = {
        charge: {
          identifier: "custom-id-777",
          customFieldAddedByGateway: "test",
        },
        correlationID: "corr-777",
        brCode: "brcode-raw",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => unexpectedResponse,
      });

      const result = await chargePost({
        correlationId: "corr-777",
        value: 500,
      });

      expect(result.chargeId).toBe("custom-id-777");
      expect(result.correlationId).toBe("corr-777");
      expect(result.brCode).toBe("brcode-raw");
    });
  });
});
