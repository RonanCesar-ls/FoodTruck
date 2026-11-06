import { Router } from "express";
import { CardapioController } from "../controllers/CardapioController.js";
import { ItemCardapioController } from "../controllers/ItemCardapioController.js";
import type { CardapioService } from "../services/CardapioService.js";
import type { ItemCardapioService } from "../services/ItemCardapioService.js";

export interface ApiServices {
  cadastro: ItemCardapioService;
  cardapio: CardapioService;
}

export function createApiRouter(services: ApiServices): Router {
  const router = Router();
  const itens = new ItemCardapioController(services.cadastro);
  const cardapio = new CardapioController(services.cardapio);

  router.post("/itens", itens.cadastrar);
  router.get("/cardapio", cardapio.listarCardapio);
  router.get("/categorias", cardapio.listarCategorias);
  return router;
}
