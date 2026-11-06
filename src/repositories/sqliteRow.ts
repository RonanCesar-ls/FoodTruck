import type { SQLOutputValue } from "node:sqlite";

type SqliteRow = Record<string, SQLOutputValue>;

/** Narrowing das linhas não tipadas retornadas pelo driver, sem casts de models. */
export function readInteger(row: SqliteRow, column: string): number {
  const value = row[column];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Coluna SQLite ${column} deve conter um inteiro seguro.`);
  }
  return value;
}

export function readText(row: SqliteRow, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new Error(`Coluna SQLite ${column} deve conter texto.`);
  }
  return value;
}

export function readNullableText(row: SqliteRow, column: string): string | null {
  return row[column] === null ? null : readText(row, column);
}
