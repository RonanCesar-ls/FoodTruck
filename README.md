# FoodTruck — backend

Sistema acadêmico de cardápio via QR Code. Esta entrega cobre somente a etapa 1:
estrutura inicial, models, interfaces e [contrato planejado da API](docs/API.md).
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

`src/app.ts` configura o parser JSON e arquivos estáticos, sem abrir porta.
`src/server.ts` inicia a escuta. O caminho de `public/` é resolvido a partir da
localização do módulo, funcionando em desenvolvimento e no build mesmo se o
processo for iniciado em outro diretório. `public/` ainda não contém frontend.

Uma requisição como `curl.exe -i http://localhost:8080/api/cardapio` retorna **404**
nesta etapa. Os exemplos de sucesso e erro em `docs/API.md` servem para mocks;
não descrevem endpoints disponíveis neste servidor.

## Organização

```text
src/
  app.ts                 Configuração do Express
  server.ts              Inicialização HTTP
  config/                Configuração de ambiente
  models/                Categoria e ItemCardapio
  repositories/          Interfaces síncronas de persistência
  services/              Regras e coordenação (etapa futura)
  controllers/           Adaptação HTTP (etapa futura)
  routes/                Registro de rotas (etapa futura)
  dtos/                  Contratos de entrada e saída (etapa futura)
  middlewares/           Tratamento HTTP compartilhado (etapa futura)
  patterns/
    strategy/            Interface de ordenação
    singleton/           Futuro gerenciador do banco
    builder/             Futura construção e validação do item
    factory-method/      Futura criação dos geradores PNG e SVG
public/                  Reservado para arquivos do frontend
docs/API.md              Contrato HTTP planejado
```

Pastas reservadas são mantidas por `.gitkeep`, sem classes de preenchimento.
Os arquivos vazios originais de `Controller/`, `Model/` e `View/` foram preservados;
a compilação considera somente `src/`.

## Decisões e próximas etapas

- `Categoria` contém identificador e nome. `ItemCardapio` referencia uma `Categoria`
  e usa `valorCentavos: number` para valores inteiros em centavos. Seu `id` padrão
  é zero até a persistência, e `descricao` tem padrão `null`.
- Os construtores inicializam os campos com tipagem estrita. Validação de domínio
  pelo Builder e conversão entre reais no HTTP e centavos internos ficam para as
  próximas etapas. Models não devem ser serializados diretamente como resposta HTTP.
- Interfaces de repositories são síncronas intencionalmente para o SQLite local.
  A persistência futura usará SQL direto nos repositories, sem ORM.
- A interface Strategy exige uma nova lista ordenada, preservando a lista de entrada.
  As estratégias concretas por nome e valor serão implementadas depois.
- Singleton, Builder e Factory Method também ficam para etapas futuras, assim como
  banco, services, controllers, DTOs, rotas de negócio, QR Code e frontend.

Somente Express é necessário em execução nesta etapa. TypeScript, `tsx` e os tipos
de Node.js/Express são ferramentas de desenvolvimento. O `package-lock.json`
registra as versões instaladas para reprodução com `npm ci`.
