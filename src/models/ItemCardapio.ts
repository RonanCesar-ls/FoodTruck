import type { Categoria } from "./Categoria.js";

export class ItemCardapio {
  /** valorCentavos representa dinheiro em centavos inteiros, nunca em reais. */
  constructor(
    public categoria: Categoria,
    public nome: string,
    public valorCentavos: number,
    public descricao: string | null = null,
    public id: number = 0,
  ) {}
}
