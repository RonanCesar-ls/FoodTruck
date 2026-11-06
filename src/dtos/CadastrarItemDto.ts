import { ValidationError } from "../errors/ValidationError.js";
import { reaisParaCentavos } from "./valor.js";

/** Entrada normalizada a partir do JSON HTTP, cujo campo monetário é valor em reais. */
export interface CadastrarItemDto {
  categoria: string;
  nome: string;
  descricao: string | null;
  valorCentavos: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCadastrarItemDto(body: unknown): CadastrarItemDto {
  if (!isObject(body)) {
    throw new ValidationError("O corpo deve ser um objeto JSON.");
  }
  if (typeof body.categoria !== "string" || typeof body.nome !== "string") {
    throw new ValidationError("Categoria e nome devem ser textos.");
  }
  if (body.descricao !== undefined && body.descricao !== null && typeof body.descricao !== "string") {
    throw new ValidationError("A descrição deve ser texto ou null.");
  }

  return {
    categoria: body.categoria,
    nome: body.nome,
    descricao: body.descricao ?? null,
    valorCentavos: reaisParaCentavos(body.valor),
  };
}
