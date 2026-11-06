/** Identifica dados inválidos para o futuro tratamento HTTP, sem ocultar falhas do banco. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
