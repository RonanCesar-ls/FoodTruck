import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const temporaryRoot = mkdtempSync(join(tmpdir(), "foodtruck-stage2-"));
process.env.DATABASE_PATH = join(temporaryRoot, "repositories", "cardapio.sqlite");

const { DatabaseConnectionManager } = await import("../dist/patterns/singleton/DatabaseConnectionManager.js");
const { CategoriaSqliteRepository } = await import("../dist/repositories/CategoriaSqliteRepository.js");
const { ItemCardapioSqliteRepository } = await import("../dist/repositories/ItemCardapioSqliteRepository.js");
const { Categoria } = await import("../dist/models/Categoria.js");
const { ItemCardapio } = await import("../dist/models/ItemCardapio.js");

let manager;
after(() => {
  manager?.close();
  // A limpeza recursiva fica restrita à pasta temporária criada por esta suíte.
  assert.equal(dirname(temporaryRoot), resolve(tmpdir()));
  assert.ok(basename(temporaryRoot).startsWith("foodtruck-stage2-"));
  rmSync(temporaryRoot, { recursive: true, force: true });
});

test("repositories persistem models, respeitam restrições e reabrem sem duplicar categorias", () => {
  manager = DatabaseConnectionManager.getInstance();
  const database = manager.getConnection();
  assert.strictEqual(DatabaseConnectionManager.getInstance(), manager);
  assert.strictEqual(manager.getConnection(), database);
  assert.equal(database.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);

  const categorias = new CategoriaSqliteRepository();
  const itens = new ItemCardapioSqliteRepository();
  const iniciais = categorias.listarTodas();
  assert.deepEqual(iniciais.map(({ nome }) => nome).sort(), ["Bebidas", "Pratos", "Sobremesas"]);
  assert.ok(iniciais.every((categoria) => categoria instanceof Categoria));
  assert.equal(categorias.buscarPorNome("Inexistente"), null);
  assert.equal(categorias.buscarPorNome("' OR 1=1 --"), null);
  assert.deepEqual(itens.listarTodos(), []);

  const categoria = categorias.buscarPorNome("Bebidas");
  assert.ok(categoria instanceof Categoria);
  const novo = new ItemCardapio(categoria, "Suco de Laranja", 890, null);
  const salvo = itens.salvar(novo);
  assert.ok(salvo instanceof ItemCardapio);
  assert.ok(Number.isSafeInteger(salvo.id) && salvo.id > 0);
  assert.equal(novo.id, 0);
  assert.notStrictEqual(salvo, novo);
  assert.equal(salvo.valorCentavos, 890);
  assert.equal(salvo.descricao, null);

  const [listado] = itens.listarTodos();
  assert.deepEqual(listado, salvo);
  assert.ok(listado.categoria instanceof Categoria);
  assert.notStrictEqual(listado.categoria, categoria);
  assert.equal(listado.categoria.id, categoria.id);
  assert.equal(listado.categoria.nome, "Bebidas");
  assert.equal(database.prepare("SELECT typeof(valor_centavos) AS tipo FROM item_cardapio WHERE id = ?").get(salvo.id).tipo, "integer");

  manager.close();
  assert.equal(database.isOpen, false);
  assert.strictEqual(DatabaseConnectionManager.getInstance(), manager);
  const reopened = manager.getConnection();
  assert.notStrictEqual(reopened, database);
  assert.deepEqual(itens.listarTodos(), [salvo]);
  assert.deepEqual(categorias.listarTodas(), iniciais);
  assert.equal(categorias.listarTodas().length, 3);
  assert.equal(reopened.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);

  assert.throws(() => reopened.prepare("INSERT INTO categoria (nome) VALUES (?)").run("Bebidas"), /UNIQUE/);
  assert.throws(() => itens.salvar(new ItemCardapio(new Categoria(-1, "Ausente"), "Inválido", 890)), /FOREIGN KEY/);
  assert.throws(() => itens.salvar(new ItemCardapio(categoria, "Negativo", -1)), /CHECK/);
  assert.throws(() => itens.salvar(new ItemCardapio(categoria, "Fracionário", 8.9)), /inteiro seguro/);
  const insert = reopened.prepare("INSERT INTO item_cardapio (categoria_id, nome, descricao, valor_centavos) VALUES (?, ?, ?, ?)");
  assert.throws(() => insert.run(null, "Sem categoria", null, 890), /NOT NULL/);
  assert.throws(() => insert.run(categoria.id, "Fracionário via SQL", null, 8.9), /REAL|INTEGER/);

  const texto = "Água '); DROP TABLE categoria; --";
  const gratuito = itens.salvar(new ItemCardapio(categoria, texto, 0, "Copo d'água"));
  assert.deepEqual(itens.listarTodos().find(({ id }) => id === gratuito.id), gratuito);
  assert.deepEqual(categorias.listarTodas(), iniciais);
});

function runModule(source, { env = process.env, imports = [] } = {}) {
  const result = spawnSync(process.execPath, [...imports, "--input-type=module"], {
    cwd: temporaryRoot,
    env,
    input: source,
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test("DATABASE_PATH resolve a mesma raiz em src e dist, fora do diretório do projeto", () => {
  const env = { ...process.env };
  delete env.DATABASE_PATH;
  delete env.PORT;
  const configSource = (location) => `
    const { config } = await import(${JSON.stringify(new URL(location, import.meta.url).href)});
    process.stdout.write(JSON.stringify(config));
  `;
  const compiled = configSource("../dist/config/env.js");
  const development = configSource("../src/config/env.ts");
  const expected = { port: 8080, databasePath: join(projectRoot, "data", "foodtruck.sqlite") };
  assert.deepEqual(JSON.parse(runModule(compiled, { env })), expected);
  assert.deepEqual(JSON.parse(runModule(development, {
    env,
    imports: ["--import", import.meta.resolve("tsx")],
  })), expected);
  env.DATABASE_PATH = "data/custom.sqlite";
  assert.equal(JSON.parse(runModule(compiled, { env })).databasePath, join(projectRoot, "data", "custom.sqlite"));
  env.DATABASE_PATH = join(temporaryRoot, "absolute.sqlite");
  assert.equal(JSON.parse(runModule(compiled, { env })).databasePath, env.DATABASE_PATH);
});

test("importar app não cria banco nem abre porta", () => {
  const databasePath = join(temporaryRoot, "app-import", "nao-criar.sqlite");
  runModule(`await import(${JSON.stringify(new URL("../dist/app.js", import.meta.url).href)});`, {
    env: { ...process.env, DATABASE_PATH: databasePath },
  });
  assert.equal(existsSync(databasePath), false);
});

test("servidor compilado inicializa SQLite temporário antes de atender HTTP", async () => {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));

  const databasePath = join(temporaryRoot, "server", "http.sqlite");
  const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/server.js", import.meta.url))], {
    cwd: temporaryRoot,
    env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = once(child, "exit");
  let timer;
  let stdout = "";
  let stderr = "";
  child.stderr.on("data", (data) => { stderr += data; });

  try {
    const started = new Promise((resolveStarted) => child.stdout.on("data", (data) => {
      stdout += data;
      if (stdout.includes(`porta ${port}.`)) resolveStarted();
    }));
    await Promise.race([
      started,
      exited.then(([code]) => { throw new Error(`Servidor encerrou (${code}): ${stderr}`); }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Timeout ao iniciar servidor")), 10000); }),
    ]);
    clearTimeout(timer);
    assert.ok(existsSync(databasePath));
    const database = new DatabaseSync(databasePath);
    try {
      assert.equal(database.prepare("SELECT COUNT(*) AS total FROM categoria").get().total, 3);
      assert.equal(database.prepare("SELECT COUNT(*) AS total FROM item_cardapio").get().total, 0);
    } finally {
      database.close();
    }
    for (const [method, route] of [["POST", "/api/itens"], ["GET", "/api/cardapio"], ["GET", "/api/categorias"], ["GET", "/api/qrcode"]]) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { method });
      await response.text();
      assert.equal(response.status, 404, `${method} ${route}`);
    }
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) child.kill();
    await exited;
  }
});
