import assert from "node:assert/strict";
import { test } from "node:test";
import { ValidationError } from "../dist/errors/ValidationError.js";
import { Categoria } from "../dist/models/Categoria.js";
import { ItemCardapio } from "../dist/models/ItemCardapio.js";
import { ItemCardapioBuilder } from "../dist/patterns/builder/ItemCardapioBuilder.js";
import { OrdenacaoPorNome } from "../dist/patterns/strategy/OrdenacaoPorNome.js";
import { OrdenacaoPorValor } from "../dist/patterns/strategy/OrdenacaoPorValor.js";
import { CardapioService } from "../dist/services/CardapioService.js";
import { ItemCardapioService } from "../dist/services/ItemCardapioService.js";

function fakeRepositories(itens = []) {
  const categorias = [new Categoria(7, "Bebidas"), new Categoria(9, "Pratos")];
  const recebidos = [];
  const salvos = [];
  const categoriaRepository = {
    listarTodas: () => categorias,
    buscarPorNome: (nome) => categorias.find((categoria) => categoria.nome === nome) ?? null,
  };
  const itemRepository = {
    listarTodos: () => itens,
    salvar(item) {
      recebidos.push(item);
      const salvo = new ItemCardapio(item.categoria, item.nome, item.valorCentavos, item.descricao, 41 + salvos.length);
      salvos.push(salvo);
      return salvo;
    },
  };
  return { categorias, categoriaRepository, itemRepository, recebidos, salvos };
}

test("Builder valida somente no build e exige categoria, nome e valor", () => {
  const categoria = new Categoria(7, "Bebidas");
  assert.throws(() => new ItemCardapioBuilder().comNome("Suco").comValorCentavos(890).build(), ValidationError);
  assert.throws(() => new ItemCardapioBuilder().comCategoria(categoria).comValorCentavos(890).build(), ValidationError);
  assert.throws(() => new ItemCardapioBuilder().comCategoria(categoria).comNome("Suco").build(), ValidationError);

  const builder = new ItemCardapioBuilder()
    .comCategoria(categoria)
    .comNome(" \t ")
    .comValorCentavos(-1);
  assert.throws(() => builder.build(), ValidationError);

  const item = builder.comNome("  Água  ").comValorCentavos(0).build();
  assert.ok(item instanceof ItemCardapio);
  assert.equal(item.id, 0);
  assert.equal(item.nome, "Água");
  assert.equal(item.descricao, null);
  assert.equal(item.valorCentavos, 0);
});

test("cadastro retorna o resultado do repository com ID e envia o item normalizado", () => {
  const fake = fakeRepositories();
  const service = new ItemCardapioService(fake.itemRepository, fake.categoriaRepository);
  const salvo = service.cadastrar(" Bebidas ", "  Suco de Laranja  ", 890, "Laranja e água");

  assert.strictEqual(salvo, fake.salvos[0]);
  assert.equal(salvo.id, 41);
  assert.equal(salvo.valorCentavos, 890);
  assert.equal(salvo.descricao, "Laranja e água");
  assert.equal(salvo.nome, "Suco de Laranja");
  assert.equal(fake.recebidos.length, 1);
  assert.equal(fake.recebidos[0].id, 0);
  assert.strictEqual(fake.recebidos[0].categoria, fake.categorias[0]);
});

test("cadastro aceita valor zero e descrição omitida, undefined ou null", () => {
  const fake = fakeRepositories();
  const service = new ItemCardapioService(fake.itemRepository, fake.categoriaRepository);
  const resultados = [
    service.cadastrar("Bebidas", "Água", 0),
    service.cadastrar("Bebidas", "Água", 0, undefined),
    service.cadastrar("Bebidas", "Água", 0, null),
  ];
  for (const item of resultados) {
    assert.ok(item.id > 0);
    assert.equal(item.valorCentavos, 0);
    assert.equal(item.descricao, null);
  }
});

test("dados inválidos são identificáveis e rejeitados antes de salvar", () => {
  const fake = fakeRepositories();
  const service = new ItemCardapioService(fake.itemRepository, fake.categoriaRepository);
  const invalidos = [
    ["Inexistente", "Suco", 890],
    ["Bebidas", " \t\n ", 890],
    ["Bebidas", "Suco", -1],
    ["Bebidas", "Suco", 8.9],
    ["Bebidas", "Suco", Number.MAX_SAFE_INTEGER + 1],
    ["Bebidas", "Suco", NaN],
    ["Bebidas", "Suco", Infinity],
  ];
  for (const args of invalidos) {
    assert.throws(() => service.cadastrar(...args), (error) => {
      assert.ok(error instanceof ValidationError);
      assert.equal(error.name, "ValidationError");
      assert.ok(error.message.length > 0);
      return true;
    });
    assert.equal(fake.recebidos.length, 0);
  }
});

test("erros de busca e gravação dos repositories permanecem distintos de validação", () => {
  const fake = fakeRepositories();
  const falha = Object.assign(new Error("database is locked"), { code: "SQLITE_BUSY" });
  const validarFalha = (error) => error === falha && !(error instanceof ValidationError);
  const falhaNaBusca = {
    ...fake.categoriaRepository,
    buscarPorNome() { throw falha; },
  };
  assert.throws(() => new ItemCardapioService(fake.itemRepository, falhaNaBusca)
    .cadastrar("Bebidas", "Suco", 890), validarFalha);
  assert.equal(fake.recebidos.length, 0);

  const falhaNaGravacao = {
    ...fake.itemRepository,
    salvar() { throw falha; },
  };
  assert.throws(() => new ItemCardapioService(falhaNaGravacao, fake.categoriaRepository)
    .cadastrar("Bebidas", "Suco", 890), validarFalha);
});

test("services com estratégias diferentes ordenam os mesmos itens sem alterar a entrada", () => {
  const categoria = Object.freeze(new Categoria(7, "Bebidas"));
  const banana = Object.freeze(new ItemCardapio(categoria, "banana", 100, null, 1));
  const agua = Object.freeze(new ItemCardapio(categoria, "Água", 900, null, 2));
  const arroz = Object.freeze(new ItemCardapio(categoria, "arroz", 500, null, 3));
  const entrada = Object.freeze([banana, agua, arroz]);
  const fake = fakeRepositories(entrada);
  const porNome = new CardapioService(fake.itemRepository, fake.categoriaRepository, new OrdenacaoPorNome()).listarCardapio();
  const porValor = new CardapioService(fake.itemRepository, fake.categoriaRepository, new OrdenacaoPorValor()).listarCardapio();

  assert.deepEqual(porNome, [agua, arroz, banana]);
  assert.deepEqual(porValor, [banana, arroz, agua]);
  assert.notStrictEqual(porNome, entrada);
  assert.notStrictEqual(porValor, entrada);
  assert.deepEqual(entrada, [banana, agua, arroz]);
});

test("estratégias preservam empates, ignoram caixa no nome e devolvem novas listas vazias", () => {
  const categoria = new Categoria(7, "Bebidas");
  const primeiro = new ItemCardapio(categoria, "água", 100, null, 1);
  const segundo = new ItemCardapio(categoria, "ÁGUA", 100, null, 2);
  const entrada = Object.freeze([segundo, primeiro]);
  for (const estrategia of [new OrdenacaoPorNome(), new OrdenacaoPorValor()]) {
    const resultado = estrategia.ordenar(entrada);
    assert.deepEqual(resultado, entrada);
    assert.notStrictEqual(resultado, entrada);
    const vazio = Object.freeze([]);
    assert.deepEqual(estrategia.ordenar(vazio), []);
    assert.notStrictEqual(estrategia.ordenar(vazio), vazio);
  }
});

test("CardapioService delega à estratégia injetada e retorna as categorias do repository", () => {
  const entrada = [new ItemCardapio(new Categoria(7, "Bebidas"), "Suco", 890)];
  const resultado = [...entrada];
  const fake = fakeRepositories(entrada);
  let chamadas = 0;
  const estrategia = {
    ordenar(itens) {
      chamadas++;
      assert.strictEqual(itens, entrada);
      return resultado;
    },
  };
  const service = new CardapioService(fake.itemRepository, fake.categoriaRepository, estrategia);
  assert.strictEqual(service.listarCardapio(), resultado);
  assert.equal(chamadas, 1);
  assert.strictEqual(service.listarCategorias(), fake.categorias);
});
