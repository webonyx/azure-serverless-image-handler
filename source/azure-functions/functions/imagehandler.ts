import { app, HttpRequest, FunctionHandler } from "@azure/functions";

import S3 from "aws-sdk/clients/s3";
import Rekognition from "aws-sdk/clients/rekognition";

import { ImageRequest } from "../../image-handler/image-request";
import { StatusCodes } from "../../image-handler/lib";
import { SecretProvider } from "../secret-provider";

import { CustomImageHandler } from "../custom-image-handler";
import { injectKeyIfMissing, getResponseHeaders } from "../lib";

const s3Client = new S3();
const rekognitionClient = new Rekognition();
const secretProvider = new SecretProvider();

const imageHandler: FunctionHandler = async (req: HttpRequest) => {
  const imageRequest = new ImageRequest(s3Client, secretProvider as any);
  const imageHandler = new CustomImageHandler(s3Client, rekognitionClient);

  const key = `public/${req.params.filename}.${req.params.extension}`;
  const encoded = injectKeyIfMissing(req.params.code, key);
  const event = {
    path: `/${encoded}`,
  };

  try {
    const imageRequestInfo = await imageRequest.setup(event);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { originalImage, ...requestInfo } = imageRequestInfo;
    console.info(requestInfo);

    const processedRequest = await imageHandler.processAndGetBuffer(imageRequestInfo);

    let headers = getResponseHeaders(false, false);
    headers["Content-Type"] = imageRequestInfo.contentType;
    // eslint-disable-next-line dot-notation
    headers["Expires"] = imageRequestInfo.expires;
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
