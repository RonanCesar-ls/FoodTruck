import { app } from "./app.js";
import { config } from "./config/env.js";

app.listen(config.port, () => {
  console.log(`FoodTruck iniciado na porta ${config.port}.`);
});
