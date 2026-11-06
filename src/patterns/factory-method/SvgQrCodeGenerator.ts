import QRCode from "qrcode";
import type { QrCodeGenerator, QrCodeImage } from "./QrCodeGenerator.js";

export class SvgQrCodeGenerator implements QrCodeGenerator {
  async generate(content: string): Promise<QrCodeImage> {
    const svg = await QRCode.toString(content, {
      type: "svg", width: 512, margin: 4, errorCorrectionLevel: "M",
    });
    return { data: Buffer.from(svg, "utf8"), contentType: "image/svg+xml" };
  }
}
