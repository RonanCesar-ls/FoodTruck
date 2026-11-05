import type { Categoria } from "../models/Categoria.js";

/** Contrato síncrono intencional para o futuro SQLite local. */
export interface CategoriaRepository {
  listarTodas(): Categoria[];
  buscarPorNome(nome: string): Categoria | null;
}
