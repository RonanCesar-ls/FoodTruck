# FoodTruck — backend

Sistema acadêmico de cardápio via QR Code. Esta entrega cobre as etapas 1 a 4:
estrutura inicial, models, persistência SQLite, Singleton, repositories síncronos,
Builder, estratégias de ordenação, services, controllers e [API HTTP](docs/API.md).
Cadastro, cardápio e categorias estão disponíveis; QR Code e integração com telas
ficam para as próximas etapas.

## Pré-requisitos

- Node.js 24 LTS (a versão principal está indicada em `.nvmrc`).
- npm, fornecido com o Node.js.

Node.js 24 é uma versão LTS conforme o [calendário oficial do Node.js](https://nodejs.org/en/about/previous-releases).
O projeto usa Express e TypeScript estrito, com módulos ESM tanto no desenvolvimento
quanto no JavaScript compilado. Imports locais usam extensão `.js`, resolvida pelo
TypeScript com `NodeNext`.

## Instalação e execução

Na raiz do repositório:

```sh
npm ci
npm run dev
```

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Executa TypeScript com `tsx watch`, reiniciando após alterações. |
| `npm run typecheck` | Verifica os tipos sem gerar arquivos. |
| `npm run build` | Compila `src/` para `dist/` usando `tsc`. |
| `npm test` | Compila e executa testes dos services, padrões e integração SQLite/HTTP real com bancos temporários. |
| `npm start` | Executa `dist/server.js`; requer build prévio. |

Para executar o build:

```sh
npm run typecheck
npm run build
npm start
```

A porta padrão é **8080**. Para usar outra porta no PowerShell:

```powershell
$env:PORT = "8081"
npm start
```

No shell POSIX: `PORT=8081 npm start`. `PORT` deve ser um inteiro de 1 a 65535.
A configuração lê o ambiente do processo; não há carregamento de arquivo `.env`.
Encerre o servidor com `Ctrl+C`.

`src/app.ts` exporta `createApp(services)`, que configura JSON, rotas, arquivos
estáticos e tratamento de erros sem abrir porta nem inicializar o banco.
`src/server.ts` inicializa o Singleton SQLite e monta os repositories, services e
`OrdenacaoPorNome` antes de criar a aplicação e iniciar a escuta. Uma falha no banco
impede a abertura da porta. O caminho de `public/` é resolvido a partir da
localização do módulo, funcionando em desenvolvimento e no build mesmo se o
processo for iniciado em outro diretório. `public/` ainda não contém frontend.

`GET /api/cardapio` retorna **200**, com `[]` quando não há itens.
`GET /api/qrcode` continua retornando **404**, pois ainda não foi implementado.

## API HTTP e Postman

| Método e rota | Resposta de sucesso |
| --- | --- |
| `POST /api/itens` | 201 — item persistido com ID gerado |
| `GET /api/cardapio` | 200 — array de itens ordenado por nome |
| `GET /api/categorias` | 200 — array de `{ id, nome }` |

Importe [a coleção do Postman](docs/FoodTruck.postman_collection.json), configure
`baseUrl` como `http://localhost:8080` e execute as requisições com o servidor ligado.
Ela contém consultas, cadastros e erros 400. Para iniciar um banco vazio sem afetar
seus dados, use um novo caminho em `DATABASE_PATH` antes de iniciar o servidor.
Os exemplos completos e o formato das respostas estão em [docs/API.md](docs/API.md).

O cadastro recebe JSON com `categoria` e `nome` como textos, `descricao` opcional
como texto/null e `valor` numérico em reais. Na fronteira HTTP, o valor é convertido
pelos dígitos decimais, sem arredondamento de casas excedentes: `0.29` vira 29 centavos;
`8.901`, negativos, strings monetárias e centavos fora do intervalo seguro são rejeitados.
O Builder continua responsável pela validação do item no service.

POST e GET usam o mesmo DTO de saída: `id`, categoria em texto, `nome`,
`descricao` (ou `null`) e `valor` numérico em reais. Dados inválidos, categoria
inexistente e JSON malformado retornam 400 com `{ "erro": "mensagem" }`.
Erros inesperados retornam 500 com `{ "erro": "Erro interno do servidor." }`;
os detalhes ficam somente no log do servidor.

## Persistência SQLite

O projeto usa `DatabaseSync` de `node:sqlite`, incluído no Node.js 24, sem driver
externo nem ORM. No Node.js 24.12.0, o módulo emite um aviso de recurso experimental,
conforme a [documentação dessa versão](https://nodejs.org/download/release/v24.12.0/docs/api/sqlite.html).

O arquivo padrão é `data/foodtruck.sqlite`, ignorado pelo Git. Seu diretório é
criado automaticamente. Para escolher outro arquivo no PowerShell:

```powershell
$env:DATABASE_PATH = "data/desenvolvimento.sqlite"
npm start
```

No shell POSIX: `DATABASE_PATH=data/desenvolvimento.sqlite npm start`.
Caminhos relativos são resolvidos a partir da **raiz do projeto**, tanto ao executar
`src/` quanto `dist/`, independentemente do diretório de execução. Caminhos absolutos
também são aceitos. Use um arquivo separado para testes e não versione bancos locais.
As variáveis são lidas ao carregar a configuração; alterá-las exige reiniciar o processo.

`sql/schema.sql` cria as tabelas `categoria` e `item_cardapio` e insere `Bebidas`,
`Pratos` e `Sobremesas` em uma transação. A inicialização pode ser repetida sem
apagar dados nem duplicar categorias; não substitui registros existentes. As tabelas
`STRICT`, a chave estrangeira habilitada e as restrições SQL garantem categoria
obrigatória, nome único de categoria e preço em centavos inteiros não negativos.
A descrição aceita `NULL`.

`DatabaseConnectionManager.getInstance()` fornece o mesmo gerenciador no processo.
`getConnection()` compartilha a conexão; `close()` a encerra e um novo acesso a
reabre e reaplica a inicialização idempotente, mantendo a identidade do Singleton.
Os repositories usam esse gerenciador e consultas parametrizadas. `salvar()` insere
um item e devolve uma nova instância com o ID gerado, sem alterar o item recebido.
`listarTodos()` reconstrói os models e suas categorias via `JOIN`; a ordenação
fica no `CardapioService`, que recebe a estratégia pelo construtor.

O build gera somente JavaScript. Para executar em outro ambiente, mantenha `dist/`,
`sql/`, `public/`, `package.json` e as dependências de execução na mesma estrutura.
O script SQL é lido por um caminho relativo ao módulo, não ao diretório de execução.

## Builder, estratégias e services

`ItemCardapioBuilder` oferece os métodos encadeáveis `comCategoria`, `comNome`,
`comDescricao` e `comValorCentavos`. Somente `build()` valida os dados e cria o
model: categoria obrigatória, nome aparado e não vazio, valor em centavos inteiro
seguro e não negativo. Zero é permitido; descrição ausente é `null`. O item é
construído com `id` zero até a persistência.

`ValidationError`, em `src/errors/`, identifica dados inválidos por `instanceof`.
Falhas dos repositories são propagadas sem conversão para esse erro, permitindo
que a futura camada HTTP distinga falhas de persistência de erros de validação.

Os services recebem as interfaces dos repositories pelo construtor, sem depender
das classes SQLite:

```ts
const cadastro = new ItemCardapioService(itemRepository, categoriaRepository);
const salvo = cadastro.cadastrar("Bebidas", "Suco de Laranja", 890, "Laranja e água");
const gratuito = cadastro.cadastrar("Bebidas", "Água", 0);

const cardapio = new CardapioService(
  itemRepository,
  categoriaRepository,
  new OrdenacaoPorNome(),
);
const itens = cardapio.listarCardapio();
const categorias = cardapio.listarCategorias();
```

A assinatura de cadastro é `cadastrar(nomeCategoria, nome, valorCentavos, descricao?)`.
O service procura a categoria pelo nome (aparando espaços externos), usa o Builder
e retorna o resultado de `salvar()`, já com o ID atribuído pelo repository.

`OrdenacaoPorNome` compara nomes em português brasileiro, ignorando diferenças de
maiúsculas e minúsculas. `OrdenacaoPorValor` compara os centavos em ordem crescente.
Ambas retornam uma nova lista e preservam a ordem da lista de entrada; empates
mantêm a ordem relativa original. Para trocar a ordenação, injete outra estratégia
no `CardapioService`. A futura montagem da API usará `OrdenacaoPorNome` como padrão.

Os services continuam trabalhando exclusivamente com centavos inteiros. Controllers
adaptam HTTP aos services, e DTOs validam a entrada e mapeiam a saída. A conversão
monetária não interfere nos contratos síncronos da camada de domínio/persistência.

## Organização

```text
src/
  app.ts                 Configuração do Express
  server.ts              Inicialização HTTP
  config/                Configuração de ambiente
  errors/                ValidationError para dados inválidos
  models/                Categoria e ItemCardapio
  repositories/          Interfaces, repositories SQLite e leitura tipada das linhas
  services/              Cadastro e consulta do cardápio/categorias
  controllers/           Adaptação HTTP e delegação aos services
  routes/                Registro de POST itens e GET cardápio/categorias
  dtos/                  Validação da entrada, conversão monetária e saída JSON
  middlewares/           Tratamento centralizado de erros 400/500
  patterns/
    strategy/            Interface e ordenações por nome ou valor
    singleton/           DatabaseConnectionManager
    builder/             ItemCardapioBuilder (construção e validação)
    factory-method/      Futura criação dos geradores PNG e SVG
public/                  Reservado para arquivos do frontend
sql/schema.sql           Tabelas e categorias iniciais (inicialização idempotente)
tests/                   Services com repositories falsos e integração SQLite/HTTP
data/                    Banco local, criado em execução e ignorado pelo Git
docs/API.md              Contrato HTTP (três rotas disponíveis, QR planejado)
docs/FoodTruck.postman_collection.json  Exemplos importáveis no Postman
```

Pastas reservadas são mantidas por `.gitkeep`, sem classes de preenchimento.
Os arquivos vazios e sem referências de `Controller/`, `Model/` e `View/` foram
removidos. Models ficam em `src/models/`, controllers em `src/controllers/` e os
futuros arquivos do frontend em `public/`. A compilação considera somente `src/`.

## Decisões e próximas etapas

- `Categoria` contém identificador e nome. `ItemCardapio` referencia uma `Categoria`
  e usa `valorCentavos: number` para valores inteiros em centavos. Seu `id` padrão
  é zero até a persistência, e `descricao` tem padrão `null`.
- Os construtores inicializam os campos com tipagem estrita. O cadastro usa o
  Builder para validar o domínio. DTOs convertem entre reais no HTTP e centavos
  internos e mapeiam as respostas, sem serializar os models diretamente.
- Interfaces de repositories são síncronas intencionalmente para o SQLite local.
  A persistência usa SQL direto nos repositories, sem ORM. Valores fracionários
  ou fora dos inteiros seguros de JavaScript são rejeitados na gravação do preço.
- A interface Strategy exige uma nova lista ordenada, preservando a lista de entrada.
  As implementações por nome e valor são injetadas no service de consulta.
- Singleton, persistência SQLite, Builder, Strategy, services e as três primeiras
  rotas HTTP estão implementados. Factory Method, QR Code e integração com frontend
  ficam para etapas futuras.

Somente Express é necessário em execução nesta etapa. TypeScript, `tsx` e os tipos
de Node.js/Express são ferramentas de desenvolvimento. O `package-lock.json`
registra as versões instaladas para reprodução com `npm ci`.
