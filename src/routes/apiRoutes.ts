import { Router } from "express";
import { CardapioController } from "../controllers/CardapioController.js";
import { ItemCardapioController } from "../controllers/ItemCardapioController.js";
import { QrCodeController } from "../controllers/QrCodeController.js";
import type { CardapioService } from "../services/CardapioService.js";
import type { ItemCardapioService } from "../services/ItemCardapioService.js";
import type { QrCodeService } from "../services/QrCodeService.js";

export interface ApiServices {
  cadastro: ItemCardapioService;
  cardapio: CardapioService;
  qrcode: QrCodeService;
}

export function createApiRouter(services: ApiServices): Router {
  const router = Router();
  const itens = new ItemCardapioController(services.cadastro);
  const cardapio = new CardapioController(services.cardapio);
  const qrcode = new QrCodeController(services.qrcode);

  router.post("/itens", itens.cadastrar);
  router.get("/cardapio", cardapio.listarCardapio);
  router.get("/categorias", cardapio.listarCategorias);
  router.get("/qrcode", qrcode.gerar);
  return router;
}
