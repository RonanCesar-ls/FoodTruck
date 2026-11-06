import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "../../config/env.js";

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager | undefined;
  private database: DatabaseSync;

  private constructor() {
    this.database = this.openDatabase();
  }

  static getInstance(): DatabaseConnectionManager {
    DatabaseConnectionManager.instance ??= new DatabaseConnectionManager();
    return DatabaseConnectionManager.instance;
  }

  /** Reabre a conexão após close(), preservando a identidade do Singleton. */
  getConnection(): DatabaseSync {
    if (!this.database.isOpen) {
      this.database = this.openDatabase();
    }
    return this.database;
  }

  close(): void {
    if (this.database.isOpen) {
      this.database.close();
    }
  }

  private openDatabase(): DatabaseSync {
    const schema = readFileSync(
      new URL("../../../sql/schema.sql", import.meta.url),
      "utf8",
    );
    mkdirSync(dirname(config.databasePath), { recursive: true });
    const database = new DatabaseSync(config.databasePath, {
      enableForeignKeyConstraints: true,
    });

    try {
      database.exec(schema);
      return database;
    } catch (error) {
      database.close();
      throw error;
    }
  }
}
