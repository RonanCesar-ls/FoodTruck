// Chamadas à API e funções comuns (usado pelas duas páginas)
const USAR_MOCK = false; // true = dados falsos, para abrir as telas sem o servidor

const MOCK_CATEGORIAS = [{ id: 1, nome: "Bebidas" }, { id: 2, nome: "Pratos" }, { id: 3, nome: "Sobremesas" }];
const MOCK_CARDAPIO = [
  { id: 1, categoria: "Bebidas", nome: "Suco de Laranja", descricao: "Laranja e agua", valor: 8.0 },
  { id: 2, categoria: "Pratos", nome: "Strogonoff", descricao: "Frango, creme de leite", valor: 32.5 },
  { id: 3, categoria: "Sobremesas", nome: "Pudim", descricao: "Leite condensado, ovos", valor: 12.0 }
];

async function buscarCardapio() {
  if (USAR_MOCK) return MOCK_CARDAPIO;
  const r = await fetch("/api/cardapio");
  if (!r.ok) throw new Error("Falha ao carregar o cardapio");
  return r.json();
}

async function buscarCategorias() {
  if (USAR_MOCK) return MOCK_CATEGORIAS;
  const r = await fetch("/api/categorias");
  if (!r.ok) throw new Error("Falha ao carregar categorias");
  return r.json();
}

// dados = { categoria, nome, descricao, valor }
class CadastroError extends Error {
  constructor(message, resultadoIncerto = false) {
    super(message);
    this.resultadoIncerto = resultadoIncerto;
  }
}

function cadastroIncerto() {
  return new CadastroError("Não foi possível confirmar o cadastro. O item pode ter sido gravado. Confira o cardápio antes de iniciar um novo envio.", true);
}

async function cadastrarItem(dados) {
  if (USAR_MOCK) {
    if (dados.nome.toLowerCase() === "erro") throw new Error("Mensagem de erro de teste");
    return { id: 99, ...dados };
  }
  let r;
  try {
    r = await fetch("/api/itens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
  } catch {
    throw cadastroIncerto();
  }
  let json;
  try {
    json = await r.json();
  } catch {
    if (r.status === 400) throw new CadastroError("O cadastro foi rejeitado. Revise os campos.");
    throw cadastroIncerto();
  }
  if (r.status === 400) throw new CadastroError(json?.erro || "O cadastro foi rejeitado. Revise os campos.");
  // Uma falha após o envio, inclusive uma resposta de sucesso incompleta,
  // não comprova que o banco deixou de gravar. Nunca repetir o POST aqui.
  if (r.status !== 201 || !json || !Number.isSafeInteger(json.id) || json.id <= 0 || typeof json.nome !== "string") {
    throw cadastroIncerto();
  }
  return json;
}

function formatarValor(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cria um elemento com texto seguro (textContent, nunca innerHTML)
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}
