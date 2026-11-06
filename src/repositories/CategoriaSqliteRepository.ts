import { Categoria } from "../models/Categoria.js";
import { DatabaseConnectionManager } from "../patterns/singleton/DatabaseConnectionManager.js";
import type { CategoriaRepository } from "./CategoriaRepository.js";
import { readInteger, readText } from "./sqliteRow.js";

export class CategoriaSqliteRepository implements CategoriaRepository {
  constructor(
    private readonly manager = DatabaseConnectionManager.getInstance(),
  ) {}

  listarTodas(): Categoria[] {
    const rows = this.manager.getConnection()
      .prepare("SELECT id, nome FROM categoria ORDER BY id")
      .all();

    return rows.map((row) => new Categoria(
      readInteger(row, "id"),
      readText(row, "nome"),
    ));
  }

  buscarPorNome(nome: string): Categoria | null {
    const row = this.manager.getConnection()
      .prepare("SELECT id, nome FROM categoria WHERE nome = ?")
      .get(nome);

    return row === undefined ? null : new Categoria(
      readInteger(row, "id"),
      readText(row, "nome"),
    );
  }
}
