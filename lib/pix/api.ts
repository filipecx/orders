const rawBaseUrl = process.env.OPENPIX_API || "https://api.openpix.com.br/";
export const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`;

export const getAuthorization = (): string | undefined =>
  process.env.OPENPIX_APP_ID || process.env.AP_ID;

