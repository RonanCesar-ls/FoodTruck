import type { ItemCardapio } from "../../models/ItemCardapio.js";
import type { OrdenacaoCardapioStrategy } from "./OrdenacaoCardapioStrategy.js";

export class OrdenacaoPorValor implements OrdenacaoCardapioStrategy {
  ordenar(itens: ItemCardapio[]): ItemCardapio[] {
    return [...itens].sort((a, b) => a.valorCentavos - b.valorCentavos);
  }
}
