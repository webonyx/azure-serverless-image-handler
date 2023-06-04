import { ImageHandler } from "../image-handler/image-handler";
import { ContentTypes, ImageRequestInfo } from "../image-handler/lib";

export class CustomImageHandler extends ImageHandler {
  async processAndGetBuffer(imageRequestInfo: ImageRequestInfo): Promise<Buffer> {
    const { originalImage, edits } = imageRequestInfo;
    const options = { failOnError: false, animated: imageRequestInfo.contentType === ContentTypes.GIF };

    if (edits && Object.keys(edits).length) {
      // convert image to Sharp object
      const image = await this.instantiateSharpImage(originalImage, edits, options);
      // apply image edits
      let modifiedImage = await this.applyEdits(image, edits, options.animated);
      // modify image output if requested
      modifiedImage = this.modifyImageOutput(modifiedImage, imageRequestInfo);
      // convert to base64 encoded string
      return await modifiedImage.toBuffer();
    }

    return Buffer.from("No edits");
  }
}
