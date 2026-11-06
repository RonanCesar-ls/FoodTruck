# API FoodTruck

**Status final do backend:** as quatro rotas abaixo estão disponíveis. As telas
não estão neste checkout; veja [o guia de integração](INTEGRACAO_FRONTEND.md).

| Método e rota | Status |
| --- | --- |
| `POST /api/itens` | Disponível — cadastro com Builder e persistência SQLite |
| `GET /api/cardapio` | Disponível — ordenação por nome usando Strategy |
| `GET /api/categorias` | Disponível — categorias do SQLite |
| `GET /api/qrcode` | Disponível — PNG binário com o destino configurado |

O frontend consumirá HTTP/JSON na mesma origem do servidor. Exemplos locais usam
`http://localhost:8080`; a porta pode ser alterada por `PORT`.
Envie os cadastros com `Content-Type: application/json`. As três primeiras rotas
retornam JSON. O QR Code retorna bytes com `Content-Type: image/png`.

## Regras compartilhadas dos itens

| Campo | Contrato HTTP |
| --- | --- |
| `id` | Número atribuído pelo backend na persistência; presente nas respostas. Não é enviado no cadastro. |
| `categoria` | Texto com o nome da categoria, nunca um objeto. Categorias iniciais: `Bebidas`, `Pratos` e `Sobremesas`. |
| `nome` | Texto com o nome do item. |
| `descricao` | Texto ou `null`. Opcional no cadastro; quando ausente, será normalizada para `null` nas respostas. |
| `valor` | Número finito em reais, maior ou igual a zero, com até duas casas decimais e conversível em centavos inteiros seguros. Nunca uma string como `"8,00"`. |

`valorCentavos` é exclusivamente interno e nunca aparece no JSON. A conversão
entre reais e centavos inteiros ocorre na fronteira HTTP. O identificador
interno de um item novo será zero até sua persistência.

JSON usa ponto como separador decimal: `8.00` e `8` representam o mesmo número.
O frontend pode formatar a exibição como moeda brasileira. **Valor zero é permitido;
valores negativos são inválidos.**

O valor não é arredondado para caber em centavos: `8.901` é rejeitado. Valores como
`0.29`, `1.15` e `8.90` são aceitos e persistidos como 29, 115 e 890 centavos.
O total em centavos não pode ultrapassar `Number.MAX_SAFE_INTEGER`.

## POST /api/itens — disponível

Cadastra um item. Exemplo de corpo:

```json
{
  "categoria": "Bebidas",
  "nome": "Suco de Laranja",
  "descricao": "Laranja e água",
  "valor": 8.00
}
```

Sucesso: **HTTP 201**, contendo os mesmos campos mais o `id` atribuído:

```json
{
  "id": 1,
  "categoria": "Bebidas",
  "nome": "Suco de Laranja",
  "descricao": "Laranja e água",
  "valor": 8.00
}
```

Exemplo válido sem descrição e com valor zero:

```json
{
  "categoria": "Bebidas",
  "nome": "Água",
  "valor": 0
}
```

Resposta correspondente, **HTTP 201**:

```json
{
  "id": 2,
  "categoria": "Bebidas",
  "nome": "Água",
  "descricao": null,
  "valor": 0
}
```

Dados inválidos: **HTTP 400**, sempre no formato
`{"erro":"mensagem explicando o problema"}`. Exemplo para `valor: -1`:

```json
{
  "erro": "O valor não pode ser negativo."
}
```

Exemplo para `valor: "8,00"`:

```json
{
  "erro": "O valor deve ser um número finito em reais."
}
```

Também retornam 400: categoria inexistente, nome em branco, campos com tipos
incorretos, descrição diferente de texto/null, corpo que não seja objeto JSON,
mais de duas casas decimais e valores que excedam o limite de centavos seguros.
Esses pedidos não inserem itens.

JSON malformado retorna **HTTP 400**:

```json
{ "erro": "JSON malformado." }
```

O frontend deve apresentar o texto de `erro`, sem depender de uma mensagem literal
específica. O nome do item e o nome da categoria têm os espaços externos removidos;
o nome do item não pode ficar vazio. A descrição fornecida é preservada.

## GET /api/cardapio — disponível

Sucesso: **HTTP 200**, array de itens no mesmo formato das respostas de cadastro,
com `id`. O backend aplica **ordenação crescente por nome em português**, sem
distinguir maiúsculas de minúsculas. Exemplo:

```json
[
  {
    "id": 2,
    "categoria": "Bebidas",
    "nome": "Água",
    "descricao": null,
    "valor": 0
  },
  {
    "id": 1,
    "categoria": "Bebidas",
    "nome": "Suco de Laranja",
    "descricao": "Laranja e água",
    "valor": 8.00
  }
]
```

Quando não houver itens, **HTTP 200** com:

```json
[]
```

Não há parâmetros de busca, filtros ou ordenação neste contrato. As estratégias
internas por nome ou valor já estão implementadas e devolvem uma nova lista, sem
modificar a lista recebida. A API usa `OrdenacaoPorNome` como padrão, sem expor um
parâmetro de ordenação.

## GET /api/categorias — disponível

Sucesso: **HTTP 200**:

```json
[
  { "id": 1, "nome": "Bebidas" },
  { "id": 2, "nome": "Pratos" },
  { "id": 3, "nome": "Sobremesas" }
]
```

Os IDs são ilustrativos; o frontend deve usar os valores retornados pela API,
sem fixá-los no código. No cadastro de item, enviar o **nome** da categoria no
campo `categoria`, e não seu ID nem o objeto retornado por esta rota.

## Erros inesperados

Nas quatro rotas, falhas inesperadas de infraestrutura ou geração de imagem retornam
**HTTP 500** com mensagem genérica, sem SQL, caminhos locais ou stack trace:

```json
{ "erro": "Erro interno do servidor." }
```

## Repetir no Postman

Importe [FoodTruck.postman_collection.json](FoodTruck.postman_collection.json) e
ajuste a variável de coleção `baseUrl` (padrão `http://localhost:8080`). O servidor
precisa estar em execução. Para conferir o cardápio inicialmente vazio, escolha
um arquivo SQLite novo com `DATABASE_PATH` antes de iniciar o servidor.

A coleção inclui as quatro rotas, cadastros de `0.29` e zero sem descrição, itens
fora de ordem e seis exemplos de erro 400, incluindo JSON malformado.
Nos cadastros, use **Body → raw → JSON**. Por exemplo:

```http
POST {{baseUrl}}/api/itens
Content-Type: application/json

{"categoria":"Bebidas","nome":"Zumo","valor":0.29}
```

```http
POST {{baseUrl}}/api/itens
Content-Type: application/json

{"categoria":"Bebidas","nome":"Água","valor":0}
```

Consulte `GET {{baseUrl}}/api/categorias` e `GET {{baseUrl}}/api/cardapio`.
Compare o cardápio antes e depois dos casos inválidos: nenhum deles deve criar itens.

## GET /api/qrcode — disponível

Sucesso: **HTTP 200**, com `Content-Type: image/png` e bytes da imagem PNG no corpo.
Não há envelope JSON, string base64 ou objeto com URL na resposta.

O QR Code aponta para **`CARDAPIO_URL`**, a URL absoluta HTTP/HTTPS da página pública,
validada na inicialização. O padrão é `http://localhost:<PORT>/cardapio.html`; o
destino não é derivado do cabeçalho `Host` da requisição nem aponta para a rota JSON.
Para o celular na mesma rede, configure, por exemplo,
`CARDAPIO_URL=http://192.168.1.10:8080/cardapio.html`, substituindo o IP pelo do computador.
O valor é normalizado por `URL` antes de ser codificado.

O frontend pode referenciar `/api/qrcode` no `src` de uma imagem ou abrir essa rota
no navegador. No Postman, envie `GET {{baseUrl}}/api/qrcode` e visualize ou salve a
resposta como PNG. A imagem é criada pelo fluxo `QrCodeService` → `PngQrCodeCreator`
→ método fábrica → `PngQrCodeGenerator`. O criador SVG está implementado e testado,
mas não é exposto como outra rota ou parâmetro de formato.

**A página pública ainda não está no checkout.** Quando for entregue, coloque-a em
`public/cardapio.html` ou ajuste `CARDAPIO_URL` ao endereço real. Até isso acontecer,
a API gera o PNG corretamente, mas o endereço padrão da página retorna 404.
O destino foi validado por decodificação e por um consumidor HTML temporário, sem
afirmar teste visual ou em celular físico. O passo a passo de rede está no README.

## Escopo

O sistema terá cadastro de itens, consulta de cardápio, consulta das categorias e
QR Code do cardápio. **Não haverá pedidos, pagamentos, login, edição, exclusão,
busca ou filtros.** Não há endpoints provisórios nesta etapa.
