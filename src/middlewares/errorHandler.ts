import type { ErrorRequestHandler } from "express";
import { ValidationError } from "../errors/ValidationError.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  if (error instanceof ValidationError) {
    response.status(400).json({ erro: error.message });
    return;
  }
  if (typeof error === "object" && error !== null && "type" in error) {
    if (error.type === "entity.parse.failed") {
      response.status(400).json({ erro: "JSON malformado." });
      return;
    }
    if (error.type === "entity.too.large") {
      response.status(400).json({ erro: "O corpo JSON excede o tamanho permitido." });
      return;
    }
  }

  console.error("Erro inesperado na API:", error);
  response.status(500).json({ erro: "Erro interno do servidor." });
};
