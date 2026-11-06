import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rawPort = process.env.PORT ?? "8080";
const port = Number(rawPort);

if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT deve ser um inteiro entre 1 e 65535.");
}

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const rawDatabasePath = process.env.DATABASE_PATH ?? "data/foodtruck.sqlite";

if (rawDatabasePath.trim() === "") {
  throw new Error("DATABASE_PATH não pode ser vazio.");
}

const rawCardapioUrl = process.env.CARDAPIO_URL ?? `http://localhost:${port}/cardapio.html`;
let cardapioUrl: URL;
try {
  cardapioUrl = new URL(rawCardapioUrl);
} catch {
  throw new Error("CARDAPIO_URL deve ser uma URL absoluta com protocolo http ou https.");
}
if (!["http:", "https:"].includes(cardapioUrl.protocol)) {
  throw new Error("CARDAPIO_URL deve usar o protocolo http ou https.");
}

export const config = {
  port,
  databasePath: resolve(projectRoot, rawDatabasePath),
  cardapioUrl: cardapioUrl.href,
};
