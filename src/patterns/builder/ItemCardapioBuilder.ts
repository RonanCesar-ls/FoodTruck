import { ValidationError } from "../../errors/ValidationError.js";
import type { Categoria } from "../../models/Categoria.js";
import { ItemCardapio } from "../../models/ItemCardapio.js";

export class ItemCardapioBuilder {
  private categoria: Categoria | undefined;
  private nome: string | undefined;
  private descricao: string | null = null;
  private valorCentavos: number | undefined;

  comCategoria(categoria: Categoria): this {
    this.categoria = categoria;
    return this;
  }

  comNome(nome: string): this {
    this.nome = nome;
    return this;
  }

  comDescricao(descricao?: string | null): this {
    this.descricao = descricao ?? null;
    return this;
  }

  comValorCentavos(valorCentavos: number): this {
    this.valorCentavos = valorCentavos;
    return this;
  }

  build(): ItemCardapio {
    const nome = this.nome?.trim();
    const { categoria, valorCentavos } = this;

    if (!categoria) {
      throw new ValidationError("A categoria é obrigatória.");
    }
    if (!nome) {
      throw new ValidationError("O nome do item é obrigatório.");
    }
    if (typeof valorCentavos !== "number" || !Number.isSafeInteger(valorCentavos) || valorCentavos < 0) {
      throw new ValidationError("O valor em centavos deve ser um inteiro seguro maior ou igual a zero.");
    }

    return new ItemCardapio(categoria, nome, valorCentavos, this.descricao, 0);
  }
}
