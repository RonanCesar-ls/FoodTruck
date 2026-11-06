import { app } from "./app.js";
import { config } from "./config/env.js";
import { DatabaseConnectionManager } from "./patterns/singleton/DatabaseConnectionManager.js";

// Falhas de abertura ou de inicialização do banco impedem a escuta HTTP.
DatabaseConnectionManager.getInstance();

app.listen(config.port, () => {
  console.log(`FoodTruck iniciado na porta ${config.port}.`);
});
