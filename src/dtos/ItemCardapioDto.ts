import type { ItemCardapio } from "../models/ItemCardapio.js";

export interface ItemCardapioDto {
  id: number;
  categoria: string;
  nome: string;
  descricao: string | null;
  valor: number;
}

/** Mapeamento único para as respostas de cadastro e consulta. */
export function toItemCardapioDto(item: ItemCardapio): ItemCardapioDto {
  return {
    id: item.id,
    categoria: item.categoria.nome,
    nome: item.nome,
    descricao: item.descricao ?? null,
    valor: item.valorCentavos / 100,
  };
}
