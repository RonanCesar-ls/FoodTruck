# Verificação do backend — 6 de novembro de 2026

Ambiente executado: Node.js 24.12.0, npm e Windows. O checkout não contém telas;
os testes não usam dados reais nem o banco padrão. Arquivos SQLite e o consumidor
HTML temporário são removidos ao terminar, e os servidores de teste são encerrados.

## Comandos executados

- `npm install --save-exact qrcode`
- `npm install --save-dev --save-exact @types/qrcode jsqr sharp`
- `npm run typecheck`
- `npm test`, que executa `npm run build` antes dos testes Node.js.
- Leitura de `.env.example` com `node --env-file=.env.example --input-type=module`,
  confirmando porta, caminho e URL padrão sem abrir banco ou porta.
- Validação JSON dos 14 exemplos da coleção do Postman e `git diff --check`.

Resultado: **24 testes passaram, nenhuma falha**. A instalação informou zero
vulnerabilidades. A verificação de tipos mantém `strict: true`; nenhum erro foi
ignorado. O aviso experimental de `node:sqlite` emitido por esta versão do Node.js
não impediu a execução.

## Cenários executados

| Cenário | Evidência |
| --- | --- |
| SQLite real e Singleton | Conexão compartilhada, foreign keys habilitadas, nomes de categorias únicos, restrições de preço e ausência de descrição preservada. |
| Categorias e cardápio inicial | HTTP 200 com Bebidas, Pratos e Sobremesas e `[]` antes dos cadastros. |
| Cadastro válido | HTTP 201, IDs gerados, `0.29` persistido como 29 centavos, zero aceito e descrição omitida/null/texto. |
| Builder e erros de validação | Categoria/nome/valor obrigatórios, nome aparado, centavos inteiros seguros, sem gravar entradas inválidas. |
| Strategy | Nome em português e valor crescente produzem ordens diferentes, sem alterar a entrada; empates preservados. |
| Contrato de erro | HTTP 400 com `{erro}` para categoria inexistente, nome em branco, negativo, string monetária, precisão excedente, tipos incorretos e JSON malformado; total de itens inalterado. |
| Falha de infraestrutura | Falhas SQL reais no banco temporário e falha assíncrona de geração do QR retornam HTTP 500 genérico. |
| Reinício real | Processo do servidor compilado encerrado e iniciado novamente com o mesmo arquivo: IDs, itens, valores, descrições e categorias preservados, sem duplicatas. |
| QR PNG HTTP | HTTP 200, `image/png`, assinatura PNG, imagem rasterizada e decodificada com leitor independente; destino igual a `CARDAPIO_URL`, mesmo com `Host` diferente. |
| Criador SVG | Operação comum do criador SVG gera imagem SVG; rasterização e decodificação recuperam o mesmo destino do criador PNG. |
| Configuração | URL HTTP/HTTPS aceita; URLs relativas, vazias, inválidas e outros protocolos rejeitados antes de abrir o banco/porta. Padrão usa a porta configurada. |
| Consumidor temporário | URL decodificada abre um arquivo HTML público temporário e o consumidor acessa o contrato JSON. Nenhum frontend definitivo foi criado. |
| Separação da aplicação | Importar `app.ts` não abre banco nem porta; caminhos funcionam em `src/` e `dist/` e fora da raiz do projeto. |

## Limites e pendências externas

- Não houve teste visual em navegador: faltam os arquivos do formulário, cardápio
  público e exibição do QR. As chamadas e estados necessários constam no guia de integração.
- **Não houve teste em celular físico** nem confirmação da rede Wi-Fi do usuário.
  O passo a passo para essa demonstração está no README.
- `public/cardapio.html` ainda não existe. O QR padrão aponta para esse caminho
  convencionado; a tela deverá ser entregue ali ou `CARDAPIO_URL` deverá apontar
  para o endereço verdadeiro da página pública.
- A coleção do Postman contém exemplos importáveis. A validação HTTP automatizada
  foi executada pelo runner do Node.js; não se afirma execução da interface do Postman.
- Não foram realizados commit, push ou deploy.
