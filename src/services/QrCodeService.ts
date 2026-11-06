import type { QrCodeCreator } from "../patterns/factory-method/QrCodeCreator.js";
import type { QrCodeImage } from "../patterns/factory-method/QrCodeGenerator.js";

export class QrCodeService {
  constructor(
    private readonly creator: QrCodeCreator,
    private readonly cardapioUrl: string,
  ) {}

  gerar(): Promise<QrCodeImage> {
    return this.creator.generate(this.cardapioUrl);
  }
}
