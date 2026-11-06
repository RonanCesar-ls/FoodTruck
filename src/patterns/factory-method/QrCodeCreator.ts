import type { QrCodeGenerator, QrCodeImage } from "./QrCodeGenerator.js";

export abstract class QrCodeCreator {
  protected abstract createGenerator(): QrCodeGenerator;

  /** Operação comum: o formato é escolhido pelo método fábrica do criador concreto. */
  generate(content: string): Promise<QrCodeImage> {
    const generator = this.createGenerator();
    return generator.generate(content);
  }
}
