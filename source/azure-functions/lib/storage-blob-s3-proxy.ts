import { AWSError, Request } from "aws-sdk";
import S3 from "aws-sdk/clients/s3";
import { DefaultAzureCredential, TokenCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { PromiseResult } from "aws-sdk/lib/request";
import { convertBlockBlobResponse2S3GetObjectOutput } from "./helpers";
import { GetObjectError } from "./get-object-error";

interface StorageBlobS3ProxyOptions {
  s3: S3;
}

export class StorageBlobS3Proxy {
  public readonly credential: TokenCredential;
  public readonly s3: S3;
  public readonly config: StorageBlobS3ProxyOptions;

  blobClients: { [p: string]: BlobServiceClient } = {};

  constructor(options: StorageBlobS3ProxyOptions) {
    this.config = options;
    this.s3 = options.s3;
    this.credential = new DefaultAzureCredential();
  }

  getBlobClient(storageAccountName: string) {
    if (!(storageAccountName in this.blobClients)) {
      this.blobClients[storageAccountName] = new BlobServiceClient(
        `https://${storageAccountName}.blob.core.windows.net`,
        this.credential
      );
    }

    return this.blobClients[storageAccountName];
  }

  getObject(
    params: S3.GetObjectRequest,
    callback?: (err: AWSError, data: S3.GetObjectOutput) => void
  ): Request<S3.GetObjectOutput, AWSError> {
    const [container, path] = this.extractBlobContainer(params.Key);
    const blobServiceClient = this.getBlobClient(params.Bucket);
    const containerClient = blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(path);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;

    return {
      async promise(): Promise<PromiseResult<S3.GetObjectOutput, Error>> {
        try {
          const blockBlobResponse = await blockBlobClient.download(0);
          return await convertBlockBlobResponse2S3GetObjectOutput(blockBlobResponse);
        } catch (error) {
          const response = await that.trySecondaryStorageAccount(params.Key, error);

          // Mirror back to primary storage account
          blockBlobClient
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .upload(response.Body, response.Body.length)
            .catch(console.error)
            .then(() => console.log("Mirrored to primary storage account!"));

          return response;
        }
      },
    } as Request<object, AWSError>;
  }

  private async trySecondaryStorageAccount(
    key: string,
    previousError: Error
  ): Promise<PromiseResult<S3.GetObjectOutput, Error>> {
    const { FALLBACK_BUCKET } = process.env;
    if (FALLBACK_BUCKET === undefined) {
      return this.tryS3Fallbacks(key, previousError);
    }

    console.log(`Attempting to download file from secondary storage account "${FALLBACK_BUCKET}"`);

    const [container, path] = this.extractBlobContainer(key);

    const blobServiceClient = this.getBlobClient(FALLBACK_BUCKET);
    const containerClient = blobServiceClient.getContainerClient(container);
    const blockBlobClient = containerClient.getBlockBlobClient(path);

    try {
      const blockBlobResponse = await blockBlobClient.download(0);
      return await convertBlockBlobResponse2S3GetObjectOutput(blockBlobResponse);
    } catch (error) {
      return this.tryS3Fallbacks(key, error);
    }
  }

  private async tryS3Fallbacks(key: string, previousError: Error): Promise<PromiseResult<S3.GetObjectOutput, Error>> {
    const { FALLBACK_S3_BUCKETS } = process.env;
    if (FALLBACK_S3_BUCKETS === undefined) {
      throw new GetObjectError("NoSuchKey", previousError.message);
    }

    const buckets = FALLBACK_S3_BUCKETS.replace(/\s+/g, "").split(",");
    const [primaryBucket, secondaryBucket] = buckets;

    try {
      console.log(`Attempting to download file from S3 primary bucket "${primaryBucket}"`);
      return await this.s3
        .getObject({
          Bucket: primaryBucket,
          Key: key,
        })
        .promise();
    } catch (error) {
      if (secondaryBucket) {
        console.log(`Attempting to download file from S3 secondary bucket "${secondaryBucket}"`);
        return this.s3
          .getObject({
            Bucket: secondaryBucket,
            Key: key,
          })
          .promise();
      }
    }
  }

  private extractBlobContainer(key: string) {
    const container = key.split("/")[0];

    return [container, key.replace(`${container}/`, "")];
  }
}
