# Contrato planejado da API FoodTruck

**Status: endpoints futuros, ainda não implementados.** Esta documentação permite
ao frontend trabalhar com mocks. Até a etapa 2, as quatro rotas abaixo retornam 404
por não estarem registradas. A persistência SQLite e as categorias iniciais já são
inicializadas pelo servidor, mas ainda não estão expostas por HTTP.

O frontend consumirá HTTP/JSON na mesma origem do servidor. Exemplos locais usam
`http://localhost:8080`; a porta pode ser alterada por `PORT`.
Entradas e respostas JSON usarão `Content-Type: application/json`. A resposta do
QR Code será binária, com `Content-Type: image/png`.

## Regras compartilhadas dos itens

| Campo | Contrato HTTP |
| --- | --- |
| `id` | Número atribuído pelo backend na persistência; presente nas respostas. Não é enviado no cadastro. |
| `categoria` | Texto com o nome da categoria, nunca um objeto. Categorias iniciais: `Bebidas`, `Pratos` e `Sobremesas`. |
| `nome` | Texto com o nome do item. |
| `descricao` | Texto ou `null`. Opcional no cadastro; quando ausente, será normalizada para `null` nas respostas. |
| `valor` | Número em reais, maior ou igual a zero. Nunca uma string como `"8,00"`. |

`valorCentavos` é exclusivamente interno e nunca aparece no JSON. A conversão
entre reais e centavos inteiros será implementada posteriormente. O identificador
interno de um item novo será zero até sua persistência.

JSON usa ponto como separador decimal: `8.00` e `8` representam o mesmo número.
O frontend pode formatar a exibição como moeda brasileira. **Valor zero é permitido;
valores negativos são inválidos.**

## POST /api/itens — planejado

Cadastrará um item. Exemplo de corpo:

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
  "erro": "O valor deve ser um número em reais."
}
```

As mensagens acima são exemplos para mocks; o frontend deve apresentar o texto de
`erro`, sem depender de uma mensagem literal específica.

## GET /api/cardapio — planejado

Sucesso: **HTTP 200**, array de itens no mesmo formato das respostas de cadastro,
com `id`. O backend aplicará **ordenação padrão por nome**. Exemplo:

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
internas por nome ou valor serão implementadas em outra etapa e deverão devolver
uma nova lista, sem modificar a lista recebida.

## GET /api/categorias — planejado

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

## GET /api/qrcode — planejado

Sucesso: **HTTP 200**, com `Content-Type: image/png` e bytes da imagem PNG no corpo.
Não haverá envelope JSON, string base64 ou objeto com URL na resposta.

O QR Code apontará para a **URL configurada da página do cardápio**, não para uma
rota JSON da API. A configuração dessa URL e a geração da imagem serão feitas em
etapas futuras. Por exemplo, em um mock, o QR poderá codificar
`https://foodtruck.example/cardapio.html` (endereço apenas ilustrativo).

O frontend poderá referenciar `/api/qrcode` no `src` de uma imagem. Para mocks,
deve fornecer um arquivo PNG de exemplo com o mesmo tipo de conteúdo.
Embora os geradores PNG e SVG estejam previstos no Factory Method futuro, este
endpoint planeja somente a resposta PNG, sem parâmetro de formato.

## Escopo

O sistema terá cadastro de itens, consulta de cardápio, consulta das categorias e
QR Code do cardápio. **Não haverá pedidos, pagamentos, login, edição, exclusão,
busca ou filtros.** Não há endpoints provisórios nesta etapa.
