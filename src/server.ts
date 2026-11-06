import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { PngQrCodeCreator } from "./patterns/factory-method/PngQrCodeCreator.js";
import { DatabaseConnectionManager } from "./patterns/singleton/DatabaseConnectionManager.js";
import { OrdenacaoPorNome } from "./patterns/strategy/OrdenacaoPorNome.js";
import { CategoriaSqliteRepository } from "./repositories/CategoriaSqliteRepository.js";
import { ItemCardapioSqliteRepository } from "./repositories/ItemCardapioSqliteRepository.js";
import { CardapioService } from "./services/CardapioService.js";
import { ItemCardapioService } from "./services/ItemCardapioService.js";
import { QrCodeService } from "./services/QrCodeService.js";

// Falhas de abertura ou de inicialização do banco impedem a escuta HTTP.
const manager = DatabaseConnectionManager.getInstance();
const itens = new ItemCardapioSqliteRepository(manager);
const categorias = new CategoriaSqliteRepository(manager);
const app = createApp({
  cadastro: new ItemCardapioService(itens, categorias),
  cardapio: new CardapioService(itens, categorias, new OrdenacaoPorNome()),
  qrcode: new QrCodeService(new PngQrCodeCreator(), config.cardapioUrl),
});

app.listen(config.port, () => {
  console.log(`FoodTruck iniciado na porta ${config.port}.`);
});
