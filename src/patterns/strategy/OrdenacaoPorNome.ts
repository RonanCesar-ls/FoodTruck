import type { ItemCardapio } from "../../models/ItemCardapio.js";
import type { OrdenacaoCardapioStrategy } from "./OrdenacaoCardapioStrategy.js";

export class OrdenacaoPorNome implements OrdenacaoCardapioStrategy {
  private readonly collator = new Intl.Collator("pt-BR", { sensitivity: "accent" });

  ordenar(itens: ItemCardapio[]): ItemCardapio[] {
    return [...itens].sort((a, b) => this.collator.compare(a.nome, b.nome));
  }
}
