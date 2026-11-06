import { ValidationError } from "../errors/ValidationError.js";
import type { ItemCardapio } from "../models/ItemCardapio.js";
import { ItemCardapioBuilder } from "../patterns/builder/ItemCardapioBuilder.js";
import type { CategoriaRepository } from "../repositories/CategoriaRepository.js";
import type { ItemCardapioRepository } from "../repositories/ItemCardapioRepository.js";

export class ItemCardapioService {
  constructor(
    private readonly itemRepository: ItemCardapioRepository,
    private readonly categoriaRepository: CategoriaRepository,
  ) {}

  cadastrar(
    nomeCategoria: string,
    nome: string,
    valorCentavos: number,
    descricao?: string | null,
  ): ItemCardapio {
    const categoria = this.categoriaRepository.buscarPorNome(nomeCategoria.trim());
    if (categoria === null) {
      throw new ValidationError("A categoria informada não existe.");
    }

    const item = new ItemCardapioBuilder()
      .comCategoria(categoria)
      .comNome(nome)
      .comDescricao(descricao)
      .comValorCentavos(valorCentavos)
      .build();

    return this.itemRepository.salvar(item);
  }
}
