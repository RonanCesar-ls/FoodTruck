import QRCode from "qrcode";
import type { QrCodeGenerator, QrCodeImage } from "./QrCodeGenerator.js";

export class PngQrCodeGenerator implements QrCodeGenerator {
  async generate(content: string): Promise<QrCodeImage> {
    const data = await QRCode.toBuffer(content, {
      type: "png", width: 512, margin: 4, errorCorrectionLevel: "M",
    });
    return { data, contentType: "image/png" };
  }
}
