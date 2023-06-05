import { Headers } from "../../image-handler/lib";
import type { BlobDownloadResponseParsed } from "@azure/storage-blob";
import {PromiseResult} from "aws-sdk/lib/request";
import S3 from "aws-sdk/clients/s3";

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

/**
 *
 */
export async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const data = [];

    stream.on("data", (chunk) => {
      data.push(chunk);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(data));
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
}

export async function convertBlockBlobResponse2S3GetObjectOutput(
  blockBlobResponse: BlobDownloadResponseParsed
): Promise<PromiseResult<S3.GetObjectOutput, Error>> {
  const bodyBuffer = await streamToBuffer(blockBlobResponse.readableStreamBody);

  return {
    ContentType: blockBlobResponse.contentType,
    ContentLength: blockBlobResponse.contentLength,
    LastModified: blockBlobResponse.lastModified,
    CacheControl: blockBlobResponse.cacheControl,
    Body: bodyBuffer,
  } as PromiseResult<S3.GetObjectOutput, Error>;
}
