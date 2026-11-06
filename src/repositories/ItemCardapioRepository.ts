import type { ItemCardapio } from "../models/ItemCardapio.js";

/** Contrato síncrono intencional para o SQLite local. */
export interface ItemCardapioRepository {
  salvar(item: ItemCardapio): ItemCardapio;
  listarTodos(): ItemCardapio[];
}
