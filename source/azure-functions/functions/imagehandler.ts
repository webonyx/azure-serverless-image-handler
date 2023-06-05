import { app, HttpRequest, FunctionHandler } from "@azure/functions";

import S3 from "aws-sdk/clients/s3";
import Rekognition from "aws-sdk/clients/rekognition";

import { ImageRequest } from "../../image-handler/image-request";
import { StatusCodes, ImageHandlerEvent } from "../../image-handler/lib";
import { SecretProvider } from "../secret-provider";

import { CustomImageHandler } from "../custom-image-handler";
import { injectKeyIfMissing, getResponseHeaders, StorageBlobS3Proxy } from "../lib";

const s3Client = new S3();
const rekognitionClient = new Rekognition();
const secretProvider = new SecretProvider();
const s3Proxy = new StorageBlobS3Proxy({
  s3: s3Client,
});

const imageHandler: FunctionHandler = async (req: HttpRequest) => {
  const imageRequest = new ImageRequest(s3Proxy as unknown as S3, secretProvider as any);
  const imageHandler = new CustomImageHandler(s3Client, rekognitionClient);

  const filename = `${req.params.filename}.${req.params.extension}`;
  const key = `public/${filename}`;
  const encoded = injectKeyIfMissing(req.params.code, key);
  const event: ImageHandlerEvent = {
    path: `/${encoded}`,
    headers: req.headers,
  };

  try {
    const imageRequestInfo = await imageRequest.setup(event);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const { originalImage, ...requestInfo } = imageRequestInfo;
    // console.info(requestInfo);

    const processedRequest = await imageHandler.processAndGetBuffer(imageRequestInfo);

    let headers = getResponseHeaders(false, false);
    headers["Content-Type"] = imageRequestInfo.contentType;
    headers["Last-Modified"] = imageRequestInfo.lastModified;
    headers["Cache-Control"] = imageRequestInfo.cacheControl;

    // Apply the custom headers overwriting any that may need overwriting
    if (imageRequestInfo.headers) {
      headers = { ...headers, ...imageRequestInfo.headers };
    }

    return {
      status: 200 /* Defaults to 200 */,
      body: processedRequest,
      headers,
    };
  } catch (error) {
    console.error(error);
    return {
      status: error.status ? error.status : StatusCodes.INTERNAL_SERVER_ERROR,
      headers: getResponseHeaders(true, false),
      body: error.status
        ? JSON.stringify(error)
        : JSON.stringify({
            message: "Internal error. Please contact the system administrator.",
            code: "InternalError",
            status: StatusCodes.INTERNAL_SERVER_ERROR,
          }),
    };
  }
};

app.http("imagehandler", {
  methods: ["GET"],
  route: "{code}/{filename:guid}.{extension}",
  handler: imageHandler,
});
