import { ValidationError } from "../errors/ValidationError.js";

export function reaisParaCentavos(valor: unknown): number {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    throw new ValidationError("O valor deve ser um número finito em reais.");
  }
  if (valor < 0) {
    throw new ValidationError("O valor não pode ser negativo.");
  }

  // Usa os dígitos decimais, evitando erros como 0.29 * 100 = 28.999999999999996.
  // Valores válidos no intervalo de centavos seguros não usam notação exponencial
  // na representação canônica de Number. Não arredondamos casas excedentes.
  const decimal = valor.toString();
  if (!/^\d+(?:\.\d{1,2})?$/.test(decimal)) {
    throw new ValidationError("O valor deve ter no máximo duas casas decimais e caber em centavos inteiros seguros.");
  }

  const [inteiros, fracao = ""] = decimal.split(".");
  const centavos = BigInt(inteiros) * 100n + BigInt(fracao.padEnd(2, "0"));
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ValidationError("O valor excede o limite de centavos inteiros seguros.");
  }
  return Number(centavos);
}
