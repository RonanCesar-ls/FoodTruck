# FoodTruck — backend

Sistema acadêmico de cardápio via QR Code. Esta entrega cobre as etapas 1 e 2:
estrutura inicial, models, persistência SQLite, Singleton, repositories síncronos
e [contrato planejado da API](docs/API.md).
As rotas de negócio ainda não estão implementadas; respostas 404 são esperadas.

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
| `npm test` | Compila e executa testes de integração com SQLite real em arquivos temporários. |
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

`src/app.ts` configura o parser JSON e arquivos estáticos, sem abrir porta nem
inicializar o banco. `src/server.ts` inicializa o SQLite antes de iniciar a escuta;
uma falha no banco impede a abertura da porta. O caminho de `public/` é resolvido a partir da
localização do módulo, funcionando em desenvolvimento e no build mesmo se o
processo for iniciado em outro diretório. `public/` ainda não contém frontend.

Uma requisição como `curl.exe -i http://localhost:8080/api/cardapio` retorna **404**
nesta etapa. Os exemplos de sucesso e erro em `docs/API.md` servem para mocks;
não descrevem endpoints disponíveis neste servidor.

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
`listarTodos()` reconstrói os models e suas categorias via `JOIN`; a ordenação por
nome do contrato HTTP será responsabilidade da futura camada de aplicação.

O build gera somente JavaScript. Para executar em outro ambiente, mantenha `dist/`,
`sql/`, `public/`, `package.json` e as dependências de execução na mesma estrutura.
O script SQL é lido por um caminho relativo ao módulo, não ao diretório de execução.

## Organização

```text
src/
  app.ts                 Configuração do Express
  server.ts              Inicialização HTTP
  config/                Configuração de ambiente
  models/                Categoria e ItemCardapio
  repositories/          Interfaces, repositories SQLite e leitura tipada das linhas
  services/              Regras e coordenação (etapa futura)
  controllers/           Adaptação HTTP (etapa futura)
  routes/                Registro de rotas (etapa futura)
  dtos/                  Contratos de entrada e saída (etapa futura)
  middlewares/           Tratamento HTTP compartilhado (etapa futura)
  patterns/
    strategy/            Interface de ordenação
    singleton/           DatabaseConnectionManager
    builder/             Futura construção e validação do item
    factory-method/      Futura criação dos geradores PNG e SVG
public/                  Reservado para arquivos do frontend
sql/schema.sql           Tabelas e categorias iniciais (inicialização idempotente)
tests/                   Integração com arquivos SQLite temporários
data/                    Banco local, criado em execução e ignorado pelo Git
docs/API.md              Contrato HTTP planejado
```

Pastas reservadas são mantidas por `.gitkeep`, sem classes de preenchimento.
Os arquivos vazios e sem referências de `Controller/`, `Model/` e `View/` foram
removidos. Models ficam em `src/models/`, controllers em `src/controllers/` e os
futuros arquivos do frontend em `public/`. A compilação considera somente `src/`.

## Decisões e próximas etapas

- `Categoria` contém identificador e nome. `ItemCardapio` referencia uma `Categoria`
  e usa `valorCentavos: number` para valores inteiros em centavos. Seu `id` padrão
  é zero até a persistência, e `descricao` tem padrão `null`.
- Os construtores inicializam os campos com tipagem estrita. Validação de domínio
  pelo Builder e conversão entre reais no HTTP e centavos internos ficam para as
  próximas etapas. Models não devem ser serializados diretamente como resposta HTTP.
- Interfaces de repositories são síncronas intencionalmente para o SQLite local.
  A persistência usa SQL direto nos repositories, sem ORM. Valores fracionários
  ou fora dos inteiros seguros de JavaScript são rejeitados na gravação do preço.
- A interface Strategy exige uma nova lista ordenada, preservando a lista de entrada.
  As estratégias concretas por nome e valor serão implementadas depois.
- Singleton e persistência SQLite já estão implementados. Builder, Factory Method,
  services, controllers, DTOs, rotas de negócio, QR Code e frontend ficam para etapas futuras.

Somente Express é necessário em execução nesta etapa. TypeScript, `tsx` e os tipos
de Node.js/Express são ferramentas de desenvolvimento. O `package-lock.json`
registra as versões instaladas para reprodução com `npm ci`.
