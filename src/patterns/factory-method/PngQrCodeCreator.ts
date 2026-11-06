import { PngQrCodeGenerator } from "./PngQrCodeGenerator.js";
import { QrCodeCreator } from "./QrCodeCreator.js";
import type { QrCodeGenerator } from "./QrCodeGenerator.js";

export class PngQrCodeCreator extends QrCodeCreator {
  protected createGenerator(): QrCodeGenerator {
    return new PngQrCodeGenerator();
  }
}
