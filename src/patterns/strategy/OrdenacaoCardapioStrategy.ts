import type { ItemCardapio } from "../../models/ItemCardapio.js";

export interface OrdenacaoCardapioStrategy {
  /** Retorna uma nova lista ordenada, sem modificar a lista recebida. */
  ordenar(itens: ItemCardapio[]): ItemCardapio[];
}
