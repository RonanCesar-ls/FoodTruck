// Página do cliente: busca o cardápio e agrupa por categoria
const lista = document.getElementById("lista");

function mostrarEstado(icone, titulo, texto, rotulo, vermelho) {
  const box = el("div", "estado");
  box.append(el("div", "icone", icone), el("h3", "", titulo), el("p", "", texto));
  const btn = el("button", "btn" + (vermelho ? "" : " btn-escuro"), rotulo);
  btn.addEventListener("click", carregar);
  box.append(btn);
  lista.replaceChildren(box);
}

function mostrarCardapio(itens) {
  // Agrupa mantendo a ordem recebida (a ordenação é feita pelo back-end)
  const grupos = new Map();
  for (const i of itens) {
    if (!grupos.has(i.categoria)) grupos.set(i.categoria, []);
    grupos.get(i.categoria).push(i);
  }
  const frag = document.createDocumentFragment();
  for (const [categoria, produtos] of grupos) {
    frag.append(el("h3", "categoria", categoria));
    for (const p of produtos) {
      const item = el("div", "item");
      const info = el("div");
      info.append(el("h4", "", p.nome));
      if (p.descricao) info.append(el("p", "", p.descricao));
      item.append(info, el("span", "preco", formatarValor(p.valor)));
      frag.append(item);
    }
  }
  lista.replaceChildren(frag);
}

async function carregar() {
  lista.replaceChildren(el("p", "estado", "Carregando..."));
  try {
    const itens = await buscarCardapio();
    if (itens.length === 0) {
      mostrarEstado("🍽️", "Cardápio vazio", "Ainda não há itens cadastrados.", "Atualizar", false);
    } else {
      mostrarCardapio(itens);
    }
  } catch (e) {
    mostrarEstado("⚠️", "Erro ao carregar o cardápio", "Não foi possível carregar os itens. Tente novamente.", "Tentar novamente", true);
  }
}

carregar();
