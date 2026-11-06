import type { Categoria } from "../models/Categoria.js";
import type { ItemCardapio } from "../models/ItemCardapio.js";
import type { OrdenacaoCardapioStrategy } from "../patterns/strategy/OrdenacaoCardapioStrategy.js";
import type { CategoriaRepository } from "../repositories/CategoriaRepository.js";
import type { ItemCardapioRepository } from "../repositories/ItemCardapioRepository.js";

export class CardapioService {
  constructor(
    private readonly itemRepository: ItemCardapioRepository,
    private readonly categoriaRepository: CategoriaRepository,
    private readonly ordenacao: OrdenacaoCardapioStrategy,
  ) {}

  listarCardapio(): ItemCardapio[] {
    return this.ordenacao.ordenar(this.itemRepository.listarTodos());
  }

  listarCategorias(): Categoria[] {
    return this.categoriaRepository.listarTodas();
  }
}
