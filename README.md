# FoodTruck — backend

Sistema acadêmico de cardápio via QR Code. Backend concluído, com quatro rotas:
estrutura inicial, models, persistência SQLite, Singleton, repositories síncronos,
Builder, estratégias de ordenação, Factory Method, services, controllers e [API HTTP](docs/API.md).
Cadastro, cardápio, categorias e QR Code PNG estão disponíveis. **As telas ainda
não foram fornecidas:** `public/` contém apenas `.gitkeep`. A integração externa
está descrita em [docs/INTEGRACAO_FRONTEND.md](docs/INTEGRACAO_FRONTEND.md).

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
| `npm test` | Compila e testa services, padrões, SQLite/HTTP, reinício do servidor e decodificação de QR PNG/SVG. |
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

### Variáveis de ambiente

| Variável | Padrão | Regra |
| --- | --- | --- |
| `PORT` | `8080` | Inteiro de 1 a 65535. |
| `DATABASE_PATH` | `data/foodtruck.sqlite` | Arquivo SQLite; caminhos relativos à raiz do projeto. |
| `CARDAPIO_URL` | `http://localhost:<PORT>/cardapio.html` | URL absoluta HTTP/HTTPS da página pública; validada antes de abrir o banco e a porta. |

O destino do QR é a URL configurada, normalizada por `URL`, nunca o cabeçalho
`Host` recebido. Se `PORT` mudar e `CARDAPIO_URL` estiver ausente, o padrão acompanha
a nova porta. Ao definir `CARDAPIO_URL` explicitamente, mantenha a porta e o caminho
coerentes com a página real. **A página `public/cardapio.html` ainda deve ser entregue
pelo frontend; o QR não cria uma tela e o destino padrão retornará 404 até lá.**

[.env.example](.env.example) contém um exemplo. Para usar um arquivo de ambiente
com o suporte nativo do Node.js, sem instalar `dotenv`:

```powershell
Copy-Item .env.example .env
# Edite .env com a porta, o banco e a URL pública desejados.
npm run build
node --env-file=.env dist/server.js
```

`npm start` e `npm run dev` continuam lendo somente o ambiente do processo.
Não sobrescreva um `.env` já existente ao copiar o exemplo.

`src/app.ts` exporta `createApp(services)`, que configura JSON, rotas, arquivos
estáticos e tratamento de erros sem abrir porta nem inicializar o banco.
`src/server.ts` inicializa o Singleton SQLite e monta os repositories, services e
`OrdenacaoPorNome` e o criador PNG antes de criar a aplicação e iniciar a escuta. Uma falha no banco
impede a abertura da porta. O caminho de `public/` é resolvido a partir da
localização do módulo, funcionando em desenvolvimento e no build mesmo se o
processo for iniciado em outro diretório. `public/` ainda não contém frontend.

`GET /api/cardapio` retorna **200**, com `[]` quando não há itens.
`GET /api/qrcode` retorna **200**, com bytes PNG e `Content-Type: image/png`.

## API HTTP e Postman

| Método e rota | Resposta de sucesso |
| --- | --- |
| `POST /api/itens` | 201 — item persistido com ID gerado |
| `GET /api/cardapio` | 200 — array de itens ordenado por nome |
| `GET /api/categorias` | 200 — array de `{ id, nome }` |
| `GET /api/qrcode` | 200 — imagem PNG com a URL pública do cardápio |

Importe [a coleção do Postman](docs/FoodTruck.postman_collection.json), configure
`baseUrl` como `http://localhost:8080` e execute as requisições com o servidor ligado.
Ela contém as quatro rotas, cadastros e erros 400. Para iniciar um banco vazio sem afetar
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
que a camada HTTP distinga falhas de persistência de erros de validação.

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
no `CardapioService`. A API usa `OrdenacaoPorNome` como padrão; a estratégia por
valor permanece disponível e testada, sem adicionar filtros ou parâmetros à API.

Os services continuam trabalhando exclusivamente com centavos inteiros. Controllers
adaptam HTTP aos services, e DTOs validam a entrada e mapeiam a saída. A conversão
monetária não interfere nos contratos síncronos da camada de domínio/persistência.

## Padrões GoF no fluxo real

| Padrão | Implementação e participação |
| --- | --- |
| Singleton | `DatabaseConnectionManager.getInstance()` fornece a conexão compartilhada aos repositories SQLite. |
| Builder | `ItemCardapioService.cadastrar()` usa `ItemCardapioBuilder.build()` antes de persistir. |
| Strategy | `CardapioService.listarCardapio()` delega à estratégia injetada; a API usa `OrdenacaoPorNome`. |
| Factory Method | `QrCodeCreator.generate()` chama o método fábrica `createGenerator()`; `PngQrCodeCreator` cria o gerador usado em `GET /api/qrcode`. `SvgQrCodeCreator` cria o gerador SVG, verificado pelos testes. |

Os geradores implementam `QrCodeGenerator` e usam a biblioteca `qrcode`. O service
recebe o criador e `CARDAPIO_URL`; o controller retorna a imagem. SVG é uma opção
interna de criação, sem uma quinta rota nem parâmetro de formato no HTTP.
`sharp` e `jsqr` são dependências somente de teste: rasterizam as duas imagens e
decodificam o conteúdo com um leitor independente.

## Demonstração na mesma rede pelo celular

1. Receba as telas da outra pessoa e coloque a página pública em
   `public/cardapio.html`, ou ajuste `CARDAPIO_URL` ao endereço real do frontend.
   Conecte as três telas conforme [o guia de integração](docs/INTEGRACAO_FRONTEND.md).
2. Conecte computador e celular à mesma rede Wi-Fi. Consulte o IPv4 local do
   computador com `ipconfig` (por exemplo, `192.168.1.10`).
3. No PowerShell, configure e inicie:

   ```powershell
   $env:PORT = "8080"
   $env:DATABASE_PATH = "data/demonstracao.sqlite"
   $env:CARDAPIO_URL = "http://192.168.1.10:8080/cardapio.html"
   npm run build
   npm start
   ```

   Substitua o IP de exemplo pelo IP real. `localhost` no celular aponta para o
   próprio celular, por isso não deve ser usado em `CARDAPIO_URL` nessa demonstração.
   O servidor escuta nas interfaces de rede do computador.
4. Confira `GET /api/categorias` e cadastre itens pelo formulário integrado ou pela
   coleção do Postman, incluindo `valor: 0.29` e `valor: 0`. Consulte `/api/cardapio`.
5. Abra a URL de `CARDAPIO_URL` no celular para confirmar acesso à página. No
   computador, abra `http://192.168.1.10:8080/api/qrcode` e leia a imagem com a câmera
   do celular: ela deve abrir exatamente a página pública configurada.
6. Encerre e reinicie o servidor com o mesmo `DATABASE_PATH`; os itens permanecem.

Se não houver acesso pelo celular, confira o IP, a conectividade entre dispositivos
e a permissão de entrada do Node.js/porta no firewall da rede privada.
**Não foi realizado teste em celular físico nem fluxo visual em navegador nesta
entrega**, porque as telas não estão no checkout. Os testes HTTP usam um consumidor
HTML temporário não versionado, removido após validar o destino do QR.

## Organização

```text
src/
  app.ts                 Configuração do Express
  server.ts              Inicialização HTTP
  config/                Configuração de ambiente
  errors/                ValidationError para dados inválidos
  models/                Categoria e ItemCardapio
  repositories/          Interfaces, repositories SQLite e leitura tipada das linhas
  services/              Cadastro, consulta de cardápio/categorias e geração de QR
  controllers/           Adaptação HTTP e delegação aos services
  routes/                Registro das quatro rotas da API
  dtos/                  Validação da entrada, conversão monetária e saída JSON
  middlewares/           Tratamento centralizado de erros 400/500
  patterns/
    strategy/            Interface e ordenações por nome ou valor
    singleton/           DatabaseConnectionManager
    builder/             ItemCardapioBuilder (construção e validação)
    factory-method/      Interface, criador abstrato e criadores/geradores PNG e SVG
public/                  Reservado para arquivos do frontend
sql/schema.sql           Tabelas e categorias iniciais (inicialização idempotente)
tests/                   Services, SQLite/HTTP, reinício e decodificação PNG/SVG
data/                    Banco local, criado em execução e ignorado pelo Git
docs/API.md              Contrato HTTP das quatro rotas disponíveis
docs/FoodTruck.postman_collection.json  Exemplos importáveis no Postman
docs/INTEGRACAO_FRONTEND.md             Telas ausentes e chamadas a integrar
docs/VERIFICACAO.md                     Cenários executados e limites da entrega
.env.example                           Exemplo de variáveis de ambiente
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
- Singleton, persistência SQLite, Builder, Strategy, Factory Method, services e as
  quatro rotas HTTP estão implementados. A integração visual depende do recebimento
  das telas externas; não há pedidos, pagamentos, login, edição, exclusão, busca ou filtros.

Express e `qrcode` são dependências de execução; SQLite vem do Node.js.
TypeScript, `tsx`, declarações de tipos e os leitores de imagem/QR são dependências
de desenvolvimento. A biblioteca de tipos de QR inclui APIs de canvas; `lib: DOM`
é usado apenas para compatibilidade dessas declarações, mantendo `strict: true`.
O `package-lock.json` registra as versões para reprodução com `npm ci`.
Veja [o relatório de verificação](docs/VERIFICACAO.md) para os comandos e cenários executados.
