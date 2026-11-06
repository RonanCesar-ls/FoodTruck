# Integração das telas externas

## Situação do checkout

Não há HTML, CSS, JavaScript de frontend, aplicação separada ou proxy no repositório.
`public/` contém apenas `.gitkeep`. Nenhuma tela ou identidade visual foi substituída.
O backend está pronto com as quatro rotas de [API.md](API.md).

As telas que faltam receber e conectar são:

| Tela | Chamadas necessárias | Estados a implementar/verificar quando os arquivos chegarem |
| --- | --- | --- |
| Formulário de cadastro de item (arquivo não fornecido) | `GET /api/categorias` ao abrir; `POST /api/itens` ao enviar | Carregando categorias, enviando sem duplicar submissões, sucesso com item retornado, erro de validação/infraestrutura e opção de tentar novamente. |
| Cardápio público (caminho local convencionado: `public/cardapio.html`, ainda ausente) | `GET /api/cardapio` | Carregamento, lista de itens, mensagem de cardápio vazio para `[]`, erro e nova tentativa. |
| Exibição do QR Code (arquivo não fornecido; pode integrar uma tela existente) | `GET /api/qrcode` como imagem | Carregando imagem, imagem pronta, erro de carregamento e nova tentativa. |

Nenhum desses estados foi testado visualmente porque as telas estão fora do checkout.
Não foi realizado teste em celular físico. Não é necessário adicionar pedidos,
pagamentos, login, edição, exclusão, busca ou filtros.

## Mesma origem

Preserve o visual e a estrutura das telas ao recebê-las. Seus arquivos podem ser
servidos por `public/`, que o Express resolve independentemente do diretório de
execução. Use URLs relativas `/api/...`, sem fixar `localhost` no JavaScript.
Se a página pública tiver outro nome, altere `CARDAPIO_URL` para esse caminho.

Se o frontend for entregue como aplicação separada em desenvolvimento, aproveite
ou configure o proxy `/api` dessa aplicação para o backend. Não há proxy nem origem
externa conhecida para configurar neste checkout. A API não habilita CORS aberto.

## Cadastro

1. Busque `/api/categorias` e preencha o seletor com os dados retornados. O valor
   enviado em `categoria` é o **nome em texto** da opção, não seu objeto ou ID.
2. Envie JSON com `Content-Type: application/json`. `valor` deve ser um número em
   reais (zero é válido), nunca texto com vírgula; o backend realiza a conversão
   para centavos. Não envie `valorCentavos` nem um ID escolhido pelo frontend.
3. A descrição pode ser omitida ou `null`. No sucesso 201, use o objeto retornado,
   com o ID gerado. Se a resposta não for de sucesso, exiba o texto de `erro`.

```js
const resposta = await fetch('/api/itens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ categoria: 'Bebidas', nome: 'Água', valor: 0.29 })
});
const resultado = await resposta.json();
if (!resposta.ok) throw new Error(resultado.erro);
```

## Cardápio público

Consuma `/api/cardapio`; a ordenação por nome já é aplicada pelo backend.
Cada item contém `id`, `categoria` como texto, `nome`, `descricao` como texto/null
e `valor` numérico em reais. Não renderize `null` como texto. A interface pode
formatar valores com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
Insira nome e descrição como texto, preservando os dados sem interpretá-los como HTML.

## QR Code

Use, por exemplo, `<img src="/api/qrcode" alt="QR Code para abrir o cardápio">`.
Essa chamada retorna PNG binário, não JSON. Trate os eventos de carregamento e erro
da imagem. Não construa o destino a partir do `Host`: ele vem de `CARDAPIO_URL`
configurada no servidor. Não há endpoint adicional para SVG.

O padrão local é `/cardapio.html`. Quando a tela estiver pronta, confira que o
endereço configurado abre essa tela e que ela consome `/api/cardapio`. Para o
celular, use o IP do computador na mesma rede e siga a demonstração no README.

## Verificação já realizada

Os testes usam HTTP real e um consumidor HTML temporário com nome único em `public/`,
fora dos arquivos versionados. Geram o PNG pela rota, decodificam o destino,
consultam a página estática e o JSON do cardápio e depois removem o consumidor.
Isso comprova contrato e destino; não substitui o fluxo visual nas telas externas.
