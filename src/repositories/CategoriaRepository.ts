import type { Categoria } from "../models/Categoria.js";

/** Contrato síncrono intencional para o SQLite local. */
export interface CategoriaRepository {
  listarTodas(): Categoria[];
  buscarPorNome(nome: string): Categoria | null;
}
