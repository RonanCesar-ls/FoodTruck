export interface QrCodeImage {
  data: Buffer;
  contentType: "image/png" | "image/svg+xml";
}

export interface QrCodeGenerator {
  generate(content: string): Promise<QrCodeImage>;
}
