import { Headers } from "../../image-handler/lib";

/**
 * @returns string
 * @param encoded
 * @param key
 * @param prefix
 */
export function injectKeyIfMissing(encoded: string, key: string): string {
  const toBuffer = Buffer.from(encoded, "base64");

  const data = JSON.parse(toBuffer.toString());
  if (data.key) {
    return encoded;
  }

  data.key = key;

  return Buffer.from(JSON.stringify(data)).toString("base64");
}

export function getResponseHeaders(isError: boolean = false, isAlb: boolean = false): Headers {
  const { CORS_ENABLED, CORS_ORIGIN } = process.env;
  const corsEnabled = CORS_ENABLED === "Yes";
  const headers: Headers = {
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (!isAlb) {
    headers["Access-Control-Allow-Credentials"] = true;
  }

  if (corsEnabled) {
    headers["Access-Control-Allow-Origin"] = CORS_ORIGIN;
  }

  if (isError) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}
