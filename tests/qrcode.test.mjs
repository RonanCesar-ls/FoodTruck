import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import sharp from "sharp";
import { PngQrCodeCreator } from "../dist/patterns/factory-method/PngQrCodeCreator.js";
import { SvgQrCodeCreator } from "../dist/patterns/factory-method/SvgQrCodeCreator.js";

const temporaryRoot = mkdtempSync(join(tmpdir(), "foodtruck-qrcode-"));
after(() => {
  assert.equal(dirname(temporaryRoot), resolve(tmpdir()));
  assert.ok(basename(temporaryRoot).startsWith("foodtruck-qrcode-"));
  rmSync(temporaryRoot, { recursive: true, force: true });
});

async function decode(image) {
  // Rasterização independente do encoder: aceita tanto PNG quanto SVG.
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const decoded = jsQR(pixels, info.width, info.height);
  assert.ok(decoded, "O QR Code deve ser decodificável por um leitor independente.");
  return decoded.data;
}

test("criadores PNG e SVG geram imagens decodificáveis com o mesmo destino", async () => {
  const destination = "https://foodtruck.example/cardapio.html?origem=qr";
  const png = await new PngQrCodeCreator().generate(destination);
  const svg = await new SvgQrCodeCreator().generate(destination);
  assert.equal(png.contentType, "image/png");
  assert.deepEqual(png.data.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(svg.contentType, "image/svg+xml");
  assert.match(svg.data.toString("utf8"), /^<svg\s/);
  assert.equal(await decode(png.data), destination);
  assert.equal(await decode(svg.data), destination);
});

test("CARDAPIO_URL é validada na inicialização e o padrão acompanha PORT", () => {
  const env = { ...process.env, PORT: "18081", DATABASE_PATH: join(temporaryRoot, "nao-criar.sqlite") };
  delete env.CARDAPIO_URL;
  const configModule = new URL("../dist/config/env.js", import.meta.url).href;
  const source = `const { config } = await import(${JSON.stringify(configModule)}); console.log(config.cardapioUrl);`;
  function run(input, inputEnv) {
    return spawnSync(process.execPath, ["--input-type=module"], {
      input, env: inputEnv, cwd: temporaryRoot, encoding: "utf8", timeout: 10000, windowsHide: true,
    });
  }
  const defaultResult = run(source, env);
  assert.ifError(defaultResult.error);
  assert.equal(defaultResult.status, 0, defaultResult.stderr);
  assert.equal(defaultResult.stdout.trim(), "http://localhost:18081/cardapio.html");
  for (const url of ["https://menu.example/cardapio", "http://192.168.1.10:8080/cardapio.html"]) {
    const result = run(source, { ...env, CARDAPIO_URL: url });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), url);
  }
  const serverModule = new URL("../dist/server.js", import.meta.url).href;
  for (const url of ["", "/cardapio.html", "ftp://menu.example/cardapio", "javascript:alert(1)", "http://"]) {
    const result = run(`await import(${JSON.stringify(serverModule)});`, { ...env, CARDAPIO_URL: url });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /CARDAPIO_URL/);
    assert.doesNotMatch(result.stdout, /iniciado na porta/);
  }
  assert.equal(existsSync(env.DATABASE_PATH), false, "Configuração inválida deve falhar antes de abrir o banco.");
});

async function freePort() {
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function startServer(port, databasePath, cardapioUrl) {
  const child = spawn(process.execPath, [fileURLToPath(new URL("../dist/server.js", import.meta.url))], {
    cwd: temporaryRoot,
    env: { ...process.env, PORT: String(port), DATABASE_PATH: databasePath, CARDAPIO_URL: cardapioUrl },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const exited = once(child, "exit");
  async function stop() {
    if (child.exitCode === null) child.kill();
    await exited;
  }
  let timer;
  let stdout = "";
  let stderr = "";
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
  } catch (error) {
    await stop();
    throw error;
  } finally {
    clearTimeout(timer);
  }
  return { baseUrl: `http://127.0.0.1:${port}`, stop };
}

test("servidor preserva dados após reiniciar e QR abre um consumidor público temporário", async (t) => {
  const port = await freePort();
  const pageName = `foodtruck-consumidor-${randomUUID()}.html`;
  const pagePath = fileURLToPath(new URL(`../public/${pageName}`, import.meta.url));
  // O frontend está fora deste checkout. Este consumidor não é versionado e é
  // removido ao terminar; não substitui as telas que serão entregues por outra pessoa.
  writeFileSync(pagePath, `<!doctype html><meta charset="utf-8"><title>Consumidor temporário</title>
<main id="cardapio">Carregando...</main><script type="module">
const response = await fetch('/api/cardapio');
document.querySelector('#cardapio').textContent = JSON.stringify(await response.json());
</script>`, { flag: "wx" });
  t.after(() => unlinkSync(pagePath));
  const destination = `http://127.0.0.1:${port}/${pageName}`;
  const databasePath = join(temporaryRoot, "reinicio.sqlite");
  let server = await startServer(port, databasePath, destination);
  t.after(async () => { await server.stop(); });

  async function getJson(route) {
    const response = await fetch(server.baseUrl + route);
    assert.equal(response.status, 200);
    return response.json();
  }
  const categorias = await getJson("/api/categorias");
  assert.deepEqual(categorias.map(({ nome }) => nome).sort(), ["Bebidas", "Pratos", "Sobremesas"]);
  assert.deepEqual(await getJson("/api/cardapio"), []);
  const salvos = [];
  for (const item of [
    { categoria: "Bebidas", nome: "Zumo", valor: 0.29 },
    { categoria: "Bebidas", nome: "Água", valor: 0 },
    { categoria: "Sobremesas", nome: "Banana", descricao: "Fresca", valor: 8.9 },
  ]) {
    const response = await fetch(server.baseUrl + "/api/itens", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item),
    });
    assert.equal(response.status, 201);
    const salvo = await response.json();
    assert.ok(salvo.id > 0);
    assert.equal(salvo.valor, item.valor);
    assert.equal(salvo.descricao, item.descricao ?? null);
    salvos.push(salvo);
  }
  const expected = [salvos[1], salvos[2], salvos[0]];
  assert.deepEqual(await getJson("/api/cardapio"), expected);
  await server.stop();
  server = await startServer(port, databasePath, destination);
  assert.deepEqual(await getJson("/api/cardapio"), expected);
  assert.deepEqual(await getJson("/api/categorias"), categorias);

  const response = await fetch(server.baseUrl + "/api/qrcode", { headers: { Host: "nao-confiavel.invalid:1234" } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  const decodedUrl = await decode(Buffer.from(await response.arrayBuffer()));
  assert.equal(decodedUrl, destination, "O destino deve vir de CARDAPIO_URL, não do cabeçalho Host.");
  const page = await fetch(decodedUrl);
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-type"), /^text\/html/);
  assert.match(await page.text(), /Consumidor temporário/);
  // Chamadas do consumidor ao contrato real; não se afirma teste de UI ou celular.
  assert.deepEqual(await getJson("/api/cardapio"), expected);
});

test("falha assíncrona do gerador retorna 500 genérico", async (t) => {
  const port = await freePort();
  const destination = `https://menu.example/${"a".repeat(6000)}`;
  const server = await startServer(port, join(temporaryRoot, "falha-qr.sqlite"), destination);
  t.after(() => server.stop());
  const response = await fetch(server.baseUrl + "/api/qrcode");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { erro: "Erro interno do servidor." });
});
