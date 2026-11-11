import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

async function until(predicate, label) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`Timeout: ${label}`);
    await delay(10);
  }
}

function gate() {
  let release;
  const promise = new Promise((resolveGate) => { release = resolveGate; });
  return { promise, release };
}

test("telas reais em DOM de teste, com servidor compilado e SQLite temporário", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "foodtruck-frontend-"));
  const probe = net.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolveClose) => probe.close(resolveClose));
  const baseUrl = `http://127.0.0.1:${port}`;
  let child;
  let exited;

  async function stop() {
    if (child?.exitCode === null) child.kill();
    if (exited) await exited;
  }
  t.after(async () => {
    await stop();
    assert.equal(dirname(directory), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("foodtruck-frontend-"));
    rmSync(directory, { recursive: true, force: true });
  });
  async function start() {
    child = spawn(process.execPath, [fileURLToPath(new URL("../dist/server.js", import.meta.url))], {
      cwd: directory,
      env: { ...process.env, PORT: String(port), DATABASE_PATH: join(directory, "ui.sqlite"), CARDAPIO_URL: baseUrl + "/cardapio.html" },
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    exited = once(child, "exit");
    let output = "";
    let errors = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { errors += data; });
    await until(() => {
      if (child.exitCode !== null) throw new Error(errors);
      return output.includes(`porta ${port}.`);
    }, "iniciar servidor compilado");
  }
  await start();
  const menu = async () => (await fetch(baseUrl + "/api/cardapio")).json();

  async function openPage(testContext, page, hook = (_path, _options, perform) => perform()) {
    const response = await fetch(baseUrl + "/" + page);
    assert.equal(response.status, 200);
    const dom = new JSDOM(await response.text(), { url: baseUrl + "/" + page, runScripts: "outside-only" });
    testContext.after(() => dom.window.close());
    const calls = [];
    dom.window.fetch = (path, options) => {
      calls.push({ path, options });
      return hook(path, options, () => fetch(new URL(path, baseUrl), options));
    };
    // Executa os mesmos scripts servidos ao navegador; sem recursos ou UI fictícios.
    for (const script of dom.window.document.querySelectorAll("script[src]")) {
      const source = await fetch(script.src);
      assert.equal(source.status, 200);
      dom.window.eval(await source.text());
    }
    return { window: dom.window, document: dom.window.document, calls };
  }
  const ready = (document) => until(() => !document.querySelector("#categoria").disabled, "categorias reais");
  function fill(document, valor, nome = "Item de teste", descricao = "", categoria = "Bebidas") {
    for (const [id, value] of Object.entries({ valor, nome, descricao, categoria })) document.getElementById(id).value = value;
  }
  function submit(window) {
    window.document.querySelector("#form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  }
  const result = (document) => until(() => !document.querySelector("#tela-resultado").hidden, "resultado do cadastro");

  await t.test("categorias carregam, falham e recuperam; QR mantém consulta e comando de impressão", async (st) => {
    const loading = gate();
    let fail = true;
    const { window, document, calls } = await openPage(st, "admin.html", async (path, _options, perform) => {
      if (path === "/api/categorias") {
        await loading.promise;
        if (fail) throw new TypeError("Falha de consulta simulada");
      }
      return perform();
    });
    assert.match(document.querySelector("#categoria").textContent, /Carregando/);
    assert.equal(document.querySelector("#categoria").disabled, true);
    loading.release();
    await until(() => !document.querySelector("#recarregar-cat").hidden, "erro das categorias");
    fail = false;
    document.querySelector("#recarregar-cat").click();
    await ready(document);
    assert.deepEqual(Array.from(document.querySelectorAll("#categoria option")).slice(1).map((option) => option.value).sort(), ["Bebidas", "Pratos", "Sobremesas"]);
    assert.equal(calls.filter(({ path }) => path === "/api/categorias").length, 2);
    const image = document.querySelector("#qr-img");
    assert.match(document.querySelector("#qr-status").textContent, /Carregando/);
    image.dispatchEvent(new window.Event("error"));
    assert.equal(document.querySelector("#qr-tentar").hidden, false);
    document.querySelector("#qr-tentar").click();
    assert.match(image.src, /\/api\/qrcode\?t=/);
    assert.equal(document.querySelector("#imprimir").disabled, true);
    const png = await fetch(image.src);
    assert.equal(png.status, 200);
    assert.equal(png.headers.get("content-type"), "image/png");
    await png.arrayBuffer();
    // jsdom não carrega/renderiza imagens: o evento é simulado após conferir o PNG real.
    image.dispatchEvent(new window.Event("load"));
    assert.equal(image.hidden, false);
    assert.equal(document.querySelector("#imprimir").disabled, false);
    let printCalls = 0;
    window.print = () => { printCalls++; };
    document.querySelector("#imprimir").click();
    assert.equal(printCalls, 1); // Invocação, sem afirmar prévia ou impressão física.
  });

  await t.test("cardápio mostra carregamento, vazio, erro e recuperação por GET", async (st) => {
    const loading = gate();
    let fail = false;
    const { document } = await openPage(st, "cardapio.html", async (_path, _options, perform) => {
      await loading.promise;
      if (fail) throw new TypeError("Consulta indisponível");
      return perform();
    });
    assert.match(document.querySelector("#lista").textContent, /Carregando/);
    loading.release();
    await until(() => document.querySelector("#lista").textContent.includes("Cardápio vazio"), "cardápio vazio");
    fail = true;
    document.querySelector("#lista button").click();
    await until(() => document.querySelector("#lista").textContent.includes("Erro ao carregar"), "erro da consulta");
    fail = false;
    document.querySelector("#lista button").click();
    await until(() => document.querySelector("#lista").textContent.includes("Cardápio vazio"), "recuperar consulta");
  });

  await t.test("formulário cadastra zero e vírgula/ponto sem descrição; cardápio agrupa e formata BRL", async (st) => {
    const saved = [];
    const { window, document } = await openPage(st, "admin.html", async (_path, options, perform) => {
      const response = await perform();
      if (options?.method === "POST") saved.push({ input: JSON.parse(options.body), status: response.status, item: await response.clone().json() });
      return response;
    });
    await ready(document);
    for (const [price, name, category, value] of [["0", "Água zero", "Bebidas", 0], ["0,29", "Suco centavos", "Bebidas", 0.29], ["8,90", "Arroz", "Pratos", 8.9], ["8.90", "Banana", "Sobremesas", 8.9]]) {
      fill(document, price, name, "", category);
      submit(window);
      await result(document);
      assert.ok(document.querySelector("#msg").classList.contains("sucesso"));
      const response = saved.at(-1);
      assert.equal(response.status, 201);
      assert.ok(response.item.id > 0);
      assert.equal(response.input.categoria, category);
      assert.equal(response.input.valor, value);
      assert.equal(typeof response.input.valor, "number");
      assert.equal(response.input.descricao, null);
      assert.equal(response.item.descricao, null);
      document.querySelector("#voltar").click();
    }
    const publicPage = await openPage(st, "cardapio.html");
    await until(() => publicPage.document.querySelectorAll(".item").length === 4, "itens no cardápio real");
    assert.deepEqual(Array.from(publicPage.document.querySelectorAll(".categoria")).map((node) => node.textContent).sort(), ["Bebidas", "Pratos", "Sobremesas"]);
    assert.equal(publicPage.document.querySelectorAll(".item p").length, 0);
    const prices = Array.from(publicPage.document.querySelectorAll(".preco")).map((node) => node.textContent.replace(/\s/g, " "));
    assert.ok(prices.includes("R$ 0,00"));
    assert.ok(prices.includes("R$ 0,29"));
    assert.ok(prices.includes("R$ 8,90"));
  });

  await t.test("validação local rejeita vazio, negativo, expoente, hexadecimal e casas excedentes sem POST", async (st) => {
    const before = await menu();
    const { window, document, calls } = await openPage(st, "admin.html");
    await ready(document);
    for (const value of ["", " ", "-1", "1e2", "0x10", "8,901", "8.901", "8,9,0"]) {
      fill(document, value, "Preservar nome", "Preservar descrição");
      submit(window);
      assert.match(document.querySelector("#msg").textContent, /duas casas decimais/);
      assert.equal(document.querySelector("#nome").value, "Preservar nome");
      assert.equal(document.querySelector("#descricao").value, "Preservar descrição");
      assert.equal(document.querySelector("#valor").value, value);
      document.querySelector("#voltar").click();
    }
    assert.equal(calls.filter(({ options }) => options?.method === "POST").length, 0);
    assert.deepEqual(await menu(), before);
  });

  await t.test("400 real mostra erro da API e preserva campos para corrigir", async (st) => {
    let rejection;
    let rejectFirst = true;
    const before = await menu();
    const { window, document } = await openPage(st, "admin.html", async (path, options, perform) => {
      if (options?.method !== "POST" || !rejectFirst) return perform();
      rejectFirst = false;
      const response = await fetch(baseUrl + path, { ...options, body: JSON.stringify({ ...JSON.parse(options.body), categoria: "Inexistente" }) });
      assert.equal(response.status, 400);
      rejection = await response.clone().json();
      return response;
    });
    await ready(document);
    fill(document, "0,29", "Corrigir cadastro");
    submit(window);
    await result(document);
    assert.ok(document.querySelector("#msg").textContent.includes(rejection.erro));
    assert.equal(document.querySelector("#conferir-cardapio").hidden, true);
    document.querySelector("#voltar").click();
    assert.equal(document.querySelector("#nome").value, "Corrigir cadastro");
    assert.equal(document.querySelector("#valor").value, "0,29");
    assert.equal(document.querySelector("#enviar").disabled, false);
    assert.deepEqual(await menu(), before);
    fill(document, "0,29", "Cadastro corrigido");
    submit(window);
    await result(document);
    assert.ok(document.querySelector("#msg").classList.contains("sucesso"));
    assert.equal((await menu()).filter(({ nome }) => nome === "Cadastro corrigido").length, 1);
  });

  await t.test("cliques repetidos durante envio produzem uma única gravação", async (st) => {
    const sending = gate();
    let posts = 0;
    const { window, document } = await openPage(st, "admin.html", async (_path, options, perform) => {
      if (options?.method === "POST") { posts++; await sending.promise; }
      return perform();
    });
    await ready(document);
    fill(document, "0", "Clique único");
    submit(window);
    submit(window);
    assert.equal(document.querySelector("#enviar").disabled, true);
    assert.equal(posts, 1);
    sending.release();
    await result(document);
    assert.equal((await menu()).filter(({ nome }) => nome === "Clique único").length, 1);
  });

  await t.test("resposta perdida após gravar não oferece reenvio nem duplica linhas", async (st) => {
    for (const mode of ["conexão", "corpo", "resposta incompleta"]) {
      let posts = 0;
      const name = "Resposta perdida: " + mode;
      const { window, document } = await openPage(st, "admin.html", async (_path, options, perform) => {
        const response = await perform();
        if (options?.method !== "POST") return response;
        posts++;
        assert.equal(response.status, 201);
        assert.ok((await response.json()).id > 0); // Gravação confirmada antes de simular a perda.
        if (mode === "conexão") throw new TypeError("Resposta perdida após commit");
        return new Response(mode === "corpo" ? "{" : "{}", { status: 201 });
      });
      await ready(document);
      fill(document, "0,29", name);
      submit(window);
      await result(document);
      assert.match(document.querySelector("#msg").textContent, /pode ter sido gravado/);
      assert.match(document.querySelector("#msg").textContent, /Confira o cardápio/);
      assert.equal(document.querySelector("#conferir-cardapio").hidden, false);
      assert.equal(document.querySelector("#conferir-cardapio").href, baseUrl + "/cardapio.html");
      assert.equal(document.querySelector("#tentar"), null);
      document.querySelector("#voltar").click();
      assert.equal(document.querySelector("#nome").value, name);
      assert.equal(document.querySelector("#valor").value, "0,29");
      assert.equal(posts, 1);
      assert.equal((await menu()).filter(({ nome }) => nome === name).length, 1);
    }
  });

  await t.test("reinício mantém itens, categorias e conteúdo da tela pública", async (st) => {
    const before = await menu();
    const categories = await (await fetch(baseUrl + "/api/categorias")).json();
    await stop();
    await start();
    assert.deepEqual(await menu(), before);
    assert.deepEqual(await (await fetch(baseUrl + "/api/categorias")).json(), categories);
    const { document } = await openPage(st, "cardapio.html");
    await until(() => document.querySelectorAll(".item").length === before.length, "cardápio após reinício");
  });
});
