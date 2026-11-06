import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ValidationError } from "../dist/errors/ValidationError.js";
import { reaisParaCentavos } from "../dist/dtos/valor.js";

const temporaryRoot = mkdtempSync(join(tmpdir(), "foodtruck-http-"));
after(() => {
  assert.equal(dirname(temporaryRoot), resolve(tmpdir()));
  assert.ok(basename(temporaryRoot).startsWith("foodtruck-http-"));
  rmSync(temporaryRoot, { recursive: true, force: true });
});

test("conversão monetária preserva centavos e rejeita precisão excessiva e inteiros inseguros", () => {
  for (const [reais, centavos] of [[0, 0], [0.01, 1], [0.29, 29], [1.15, 115], [19.99, 1999], [123456.78, 12345678], [90071992547409.9, 9007199254740990]]) {
    assert.equal(reaisParaCentavos(reais), centavos);
  }
  for (const valor of ["8,90", "8.90", null, undefined, {}, NaN, Infinity, -Infinity, -0.01, 0.001, 1.001, 0.1 + 0.2, 1e-7, 1e100, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => reaisParaCentavos(valor), ValidationError);
  }
});

async function startCompiledServer(t) {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));

  const databasePath = join(temporaryRoot, "servidor.sqlite");
  const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/server.js", import.meta.url))], {
    cwd: temporaryRoot,
    env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = once(child, "exit");
  t.after(async () => {
    if (child.exitCode === null) child.kill();
    await exited;
  });
  let stdout = "";
  let stderr = "";
  let timer;
  child.stderr.on("data", (data) => { stderr += data; });
  try {
    await Promise.race([
      new Promise((resolveStarted) => child.stdout.on("data", (data) => {
        stdout += data;
        if (stdout.includes(`porta ${port}.`)) resolveStarted();
      })),
      exited.then(([code]) => { throw new Error(`Servidor encerrou (${code}): ${stderr}`); }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Timeout ao iniciar servidor")), 10000); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  return { baseUrl: `http://127.0.0.1:${port}`, databasePath };
}

test("HTTP real com servidor compilado e SQLite temporário", async (t) => {
  const { baseUrl, databasePath } = await startCompiledServer(t);
  const database = new DatabaseSync(databasePath);
  t.after(() => database.close());

  async function request(route, { method = "GET", body } = {}) {
    const response = await fetch(baseUrl + route, {
      method,
      ...(body === undefined ? {} : { body, headers: { "Content-Type": "application/json" } }),
    });
    assert.match(response.headers.get("content-type"), /^application\/json/);
    return { status: response.status, body: await response.json() };
  }
  const post = (body) => request("/api/itens", { method: "POST", body: JSON.stringify(body) });
  const salvos = [];

  await t.test("categorias iniciais e cardápio vazio retornam 200", async () => {
    const categorias = await request("/api/categorias");
    assert.equal(categorias.status, 200);
    assert.deepEqual(categorias.body.map(({ nome }) => nome).sort(), ["Bebidas", "Pratos", "Sobremesas"]);
    for (const categoria of categorias.body) {
      assert.ok(Number.isSafeInteger(categoria.id) && categoria.id > 0);
      assert.deepEqual(Object.keys(categoria).sort(), ["id", "nome"]);
    }
    assert.deepEqual(await request("/api/cardapio"), { status: 200, body: [] });
  });

  await t.test("POST cria itens com 0.29, zero e descrição omitida/null/texto", async () => {
    for (const body of [
      { categoria: "Bebidas", nome: "  Zumo  ", descricao: "Copo pequeno", valor: 0.29 },
      { categoria: "Bebidas", nome: "Água", valor: 0 },
      { categoria: "Sobremesas", nome: "banana", descricao: null, valor: 8.9 },
      { categoria: "Pratos", nome: "Arroz", valor: 1.15 },
    ]) {
      const result = await post(body);
      assert.equal(result.status, 201);
      assert.ok(Number.isSafeInteger(result.body.id) && result.body.id > 0);
      assert.deepEqual(Object.keys(result.body).sort(), ["categoria", "descricao", "id", "nome", "valor"]);
      assert.deepEqual(result.body, {
        id: result.body.id,
        categoria: body.categoria,
        nome: body.nome.trim(),
        descricao: body.descricao ?? null,
        valor: body.valor,
      });
      salvos.push(result.body);
    }
    assert.equal(new Set(salvos.map(({ id }) => id)).size, salvos.length);
    const row = database.prepare("SELECT valor_centavos, typeof(valor_centavos) AS tipo FROM item_cardapio WHERE id = ?").get(salvos[0].id);
    assert.equal(row.valor_centavos, 29);
    assert.equal(row.tipo, "integer");
  });

  const ordenados = () => [salvos[1], salvos[3], salvos[2], salvos[0]];
  await t.test("GET ordena por nome e usa o mesmo formato do cadastro", async () => {
    assert.deepEqual(await request("/api/cardapio"), { status: 200, body: ordenados() });
  });

  await t.test("entradas inválidas e JSON malformado retornam 400 sem inserir itens", async () => {
    const valido = { categoria: "Bebidas", nome: "Inválido", valor: 8.9 };
    const casos = [
      ["categoria inexistente", JSON.stringify({ ...valido, categoria: "Inexistente" })],
      ["nome em branco", JSON.stringify({ ...valido, nome: " \t\n " })],
      ["valor negativo", JSON.stringify({ ...valido, valor: -1 })],
      ["valor textual", JSON.stringify({ ...valido, valor: "8,90" })],
      ["mais de duas casas", JSON.stringify({ ...valido, valor: 8.901 })],
      ["precisão excedente perto de centavos", JSON.stringify({ ...valido, valor: 0.29000000000000004 })],
      ["centavos inseguros", JSON.stringify({ ...valido, valor: 1e14 })],
      ["valor ausente", JSON.stringify({ categoria: "Bebidas", nome: "Inválido" })],
      ["categoria como objeto", JSON.stringify({ ...valido, categoria: { id: 1, nome: "Bebidas" } })],
      ["nome numérico", JSON.stringify({ ...valido, nome: 5 })],
      ["descrição inválida", JSON.stringify({ ...valido, descricao: false })],
      ["array", "[]"],
      ["null", "null"],
      ["primitivo", "42"],
      ["objeto vazio", "{}"],
      ["corpo ausente", undefined],
      ["número não finito", '{"categoria":"Bebidas","nome":"Inválido","valor":1e309}'],
      ["JSON malformado", '{"categoria":"Bebidas","nome":"Inválido","valor":0.29'],
      ["corpo acima do limite", JSON.stringify({ ...valido, descricao: "x".repeat(105000) })],
    ];
    for (const [cenario, body] of casos) {
      const response = await request("/api/itens", { method: "POST", body });
      assert.equal(response.status, 400, cenario);
      assert.deepEqual(Object.keys(response.body), ["erro"], cenario);
      assert.equal(typeof response.body.erro, "string", cenario);
      assert.ok(response.body.erro.length > 0, cenario);
      assert.equal(database.prepare("SELECT COUNT(*) AS total FROM item_cardapio").get().total, salvos.length, cenario);
    }
    assert.deepEqual((await request("/api/cardapio")).body, ordenados());
  });

  await t.test("QR Code retorna PNG binário", async () => {
    const response = await fetch(baseUrl + "/api/qrcode");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    const image = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  await t.test("falhas reais de infraestrutura retornam 500 genérico", async () => {
    // Somente o banco temporário desta suíte é alterado para provocar falhas SQL.
    database.exec("DROP TABLE item_cardapio");
    assert.deepEqual(await request("/api/cardapio"), { status: 500, body: { erro: "Erro interno do servidor." } });
    assert.deepEqual(await post({ categoria: "Bebidas", nome: "Suco", valor: 8.9 }), {
      status: 500, body: { erro: "Erro interno do servidor." },
    });
    database.exec("DROP TABLE categoria");
    assert.deepEqual(await request("/api/categorias"), { status: 500, body: { erro: "Erro interno do servidor." } });
  });
});
