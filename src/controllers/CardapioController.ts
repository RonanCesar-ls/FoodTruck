import type { Request, Response } from "express";
import type { CategoriaDto } from "../dtos/CategoriaDto.js";
import { toItemCardapioDto } from "../dtos/ItemCardapioDto.js";
import type { ItemCardapioDto } from "../dtos/ItemCardapioDto.js";
import type { CardapioService } from "../services/CardapioService.js";

export class CardapioController {
  constructor(private readonly service: CardapioService) {}

  listarCardapio = (_request: Request, response: Response<ItemCardapioDto[]>): void => {
    response.status(200).json(this.service.listarCardapio().map(toItemCardapioDto));
  };

  listarCategorias = (_request: Request, response: Response<CategoriaDto[]>): void => {
    response.status(200).json(this.service.listarCategorias().map(({ id, nome }) => ({ id, nome })));
  };
}
