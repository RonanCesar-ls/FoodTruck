// Painel do restaurante: cadastro de item e QR Code
const form = document.getElementById("form");
const selectCategoria = document.getElementById("categoria");
const btnRecarregarCat = document.getElementById("recarregar-cat");
const telaForm = document.getElementById("tela-form");
const telaResultado = document.getElementById("tela-resultado");
const msg = document.getElementById("msg");
const botao = document.getElementById("enviar");
const btnTentar = document.getElementById("tentar");
let ultimoEnvio = null; // dados do último envio, para "Tentar novamente"
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
function mostrarResultado(tipo, titulo, texto, podeTentar) {
  msg.className = "msg " + tipo;
  msg.replaceChildren(el("h3", "", titulo), el("p", "", texto));
  btnTentar.hidden = !podeTentar;
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
    ultimoEnvio = null;
    mostrarResultado("sucesso", "Item cadastrado", `"${salvo.nome}" já aparece no cardápio.`, false);
  } catch (e) {
    ultimoEnvio = dados;
    mostrarResultado("erro", "Erro no cadastro", e.message, true);
  } finally {
    enviando = false;
    botao.disabled = false;
  }
}

// "89,90" -> 89.9 ; vazio ou texto inválido -> NaN
function lerValor(texto) {
  const t = texto.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const dados = {
    categoria: selectCategoria.value,
    nome: form.nome.value.trim(),
    descricao: form.descricao.value.trim(),
    valor: lerValor(form.valor.value)
  };
  if (!dados.categoria || !dados.nome || !dados.descricao || !Number.isFinite(dados.valor)) {
    ultimoEnvio = null;
    mostrarResultado("erro", "Erro no cadastro", "Preencha todos os campos. O valor deve ser um número, como 89,90.", false);
    return;
  }
  enviar(dados);
});

btnTentar.addEventListener("click", () => { if (ultimoEnvio) enviar(ultimoEnvio); });
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
