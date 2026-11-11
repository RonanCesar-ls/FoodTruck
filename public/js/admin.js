// Painel do restaurante: cadastro de item e QR Code
const form = document.getElementById("form");
const selectCategoria = document.getElementById("categoria");
const btnRecarregarCat = document.getElementById("recarregar-cat");
const telaForm = document.getElementById("tela-form");
const telaResultado = document.getElementById("tela-resultado");
const msg = document.getElementById("msg");
const botao = document.getElementById("enviar");
const conferirCardapio = document.getElementById("conferir-cardapio");
let enviando = false;

// ---- Categorias ----
async function carregarCategorias() {
  btnRecarregarCat.hidden = true;
  selectCategoria.disabled = true;
  selectCategoria.replaceChildren(el("option", "", "Carregando categorias..."));
  try {
    const lista = await buscarCategorias();
    selectCategoria.replaceChildren(el("option", "", "Selecione uma categoria"));
    selectCategoria.options[0].value = "";
    for (const c of lista) {
      const op = el("option", "", c.nome);
      op.value = c.nome; // a API recebe o NOME da categoria
      selectCategoria.append(op);
    }
    selectCategoria.disabled = false;
  } catch (e) {
    selectCategoria.replaceChildren(el("option", "", "Erro ao carregar categorias"));
    btnRecarregarCat.hidden = false;
  }
}
btnRecarregarCat.addEventListener("click", carregarCategorias);

// ---- Cadastro ----
function mostrarResultado(tipo, titulo, texto, resultadoIncerto = false) {
  msg.className = "msg " + tipo;
  msg.replaceChildren(el("h3", "", titulo), el("p", "", texto));
  conferirCardapio.hidden = !resultadoIncerto;
  document.getElementById("voltar").textContent = tipo === "sucesso" ? "Voltar ao painel" : "Voltar ao formulário";
  telaForm.hidden = true;
  telaResultado.hidden = false;
}

async function enviar(dados) {
  if (enviando) return; // evita envio duplicado
  enviando = true;
  botao.disabled = true;
  try {
    const salvo = await cadastrarItem(dados);
    form.reset();
    mostrarResultado("sucesso", "Item cadastrado", `"${salvo.nome}" já aparece no cardápio.`, false);
  } catch (e) {
    mostrarResultado("erro", e.resultadoIncerto ? "Cadastro não confirmado" : "Erro no cadastro", e.message, e.resultadoIncerto);
  } finally {
    enviando = false;
    botao.disabled = false;
  }
}

// Valida a escrita decimal antes de Number(), que também aceitaria expoente e hexadecimal.
function lerValor(texto) {
  const t = texto.trim();
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(t)) return NaN;
  const valor = Number(t.replace(",", "."));
  return Number.isFinite(valor) ? valor : NaN;
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  if (enviando) return;
  const dados = {
    categoria: selectCategoria.value,
    nome: form.elements.namedItem("nome").value.trim(),
    descricao: form.elements.namedItem("descricao").value.trim() || null,
    valor: lerValor(form.elements.namedItem("valor").value)
  };
  if (!dados.categoria || !dados.nome) {
    mostrarResultado("erro", "Erro no cadastro", "Selecione uma categoria e preencha o nome do item. A descrição é opcional.");
    return;
  }
  if (!Number.isFinite(dados.valor)) {
    mostrarResultado("erro", "Erro no cadastro", "Informe um valor maior ou igual a zero, como 0, 0,29 ou 8.90, com no máximo duas casas decimais. Não use expoente ou hexadecimal.");
    return;
  }
  enviar(dados);
});

document.getElementById("voltar").addEventListener("click", () => {
  telaResultado.hidden = true;
  telaForm.hidden = false;
});

// ---- QR Code ----
const qrImg = document.getElementById("qr-img");
const qrStatus = document.getElementById("qr-status");
const qrTentar = document.getElementById("qr-tentar");
const btnImprimir = document.getElementById("imprimir");

function carregarQR(novaTentativa) {
  qrStatus.textContent = "Carregando QR Code...";
  qrStatus.hidden = false;
  qrImg.hidden = true;
  qrTentar.hidden = true;
  btnImprimir.disabled = true;
  qrImg.src = novaTentativa ? "/api/qrcode?t=" + Date.now() : "/api/qrcode";
}
qrImg.addEventListener("load", () => {
  qrStatus.hidden = true;
  qrImg.hidden = false;
  btnImprimir.disabled = false;
});
qrImg.addEventListener("error", () => {
  qrStatus.textContent = "Não foi possível carregar o QR Code.";
  qrTentar.hidden = false;
});
qrTentar.addEventListener("click", () => carregarQR(true));
btnImprimir.addEventListener("click", () => window.print());

carregarCategorias();
carregarQR(false);
