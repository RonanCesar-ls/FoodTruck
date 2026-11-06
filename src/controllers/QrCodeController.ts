import type { Request, Response } from "express";
import type { QrCodeService } from "../services/QrCodeService.js";

export class QrCodeController {
  constructor(private readonly service: QrCodeService) {}

  gerar = async (_request: Request, response: Response): Promise<void> => {
    const image = await this.service.gerar();
    response.status(200).type(image.contentType).send(image.data);
  };
}
