import { QrCodeCreator } from "./QrCodeCreator.js";
import type { QrCodeGenerator } from "./QrCodeGenerator.js";
import { SvgQrCodeGenerator } from "./SvgQrCodeGenerator.js";

export class SvgQrCodeCreator extends QrCodeCreator {
  protected createGenerator(): QrCodeGenerator {
    return new SvgQrCodeGenerator();
  }
}
