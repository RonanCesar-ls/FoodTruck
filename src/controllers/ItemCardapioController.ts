import type { Request, Response } from "express";
import { parseCadastrarItemDto } from "../dtos/CadastrarItemDto.js";
import { toItemCardapioDto } from "../dtos/ItemCardapioDto.js";
import type { ItemCardapioDto } from "../dtos/ItemCardapioDto.js";
import type { ItemCardapioService } from "../services/ItemCardapioService.js";

export class ItemCardapioController {
  constructor(private readonly service: ItemCardapioService) {}

  cadastrar = (
    request: Request<Record<string, string>, ItemCardapioDto, unknown>,
    response: Response<ItemCardapioDto>,
  ): void => {
    const dto = parseCadastrarItemDto(request.body);
    const item = this.service.cadastrar(dto.categoria, dto.nome, dto.valorCentavos, dto.descricao);
    response.status(201).json(toItemCardapioDto(item));
  };
}
