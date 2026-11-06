import { Categoria } from "../models/Categoria.js";
import { ItemCardapio } from "../models/ItemCardapio.js";
import { DatabaseConnectionManager } from "../patterns/singleton/DatabaseConnectionManager.js";
import type { ItemCardapioRepository } from "./ItemCardapioRepository.js";
import { readInteger, readNullableText, readText } from "./sqliteRow.js";

export class ItemCardapioSqliteRepository implements ItemCardapioRepository {
  constructor(
    private readonly manager = DatabaseConnectionManager.getInstance(),
  ) {}

  salvar(item: ItemCardapio): ItemCardapio {
    if (!Number.isSafeInteger(item.valorCentavos)) {
      throw new Error("valorCentavos deve ser um inteiro seguro.");
    }

    const row = this.manager.getConnection().prepare(`
      INSERT INTO item_cardapio (categoria_id, nome, descricao, valor_centavos)
      VALUES (?, ?, ?, ?)
      RETURNING id
    `).get(item.categoria.id, item.nome, item.descricao, item.valorCentavos);

    if (row === undefined) {
      throw new Error("SQLite não retornou o identificador do item salvo.");
    }

    return new ItemCardapio(
      item.categoria,
      item.nome,
      item.valorCentavos,
      item.descricao,
      readInteger(row, "id"),
    );
  }

  listarTodos(): ItemCardapio[] {
    const rows = this.manager.getConnection().prepare(`
      SELECT item.id, item.nome, item.descricao, item.valor_centavos,
             categoria.id AS categoria_id, categoria.nome AS categoria_nome
      FROM item_cardapio AS item
      JOIN categoria ON categoria.id = item.categoria_id
      ORDER BY item.id
    `).all();

    return rows.map((row) => new ItemCardapio(
      new Categoria(
        readInteger(row, "categoria_id"),
        readText(row, "categoria_nome"),
      ),
      readText(row, "nome"),
      readInteger(row, "valor_centavos"),
      readNullableText(row, "descricao"),
      readInteger(row, "id"),
    ));
  }
}
