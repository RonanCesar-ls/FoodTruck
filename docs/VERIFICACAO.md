# Verificação da integração — 11 de novembro de 2026

Ambiente: Windows, Node.js 24.12.0 e npm. Git inicialmente limpo na main.
As duas telas e seus scripts, CSS e logo já estavam presentes. Foram preservados
visual, chamadas relativas, quatro rotas e os quatro padrões GoF. Nenhum banco
real foi utilizado: processos e arquivos SQLite temporários são encerrados/removidos.

## Comandos executados

- `npm install --save-dev --save-exact jsdom` (somente teste).
- `npm run typecheck`.
- `npm run build`.
- `npm test` (também recompila antes do runner do Node.js).

Resultado: **33 testes passaram, nenhuma falha**. A instalação informou zero
vulnerabilidades. TypeScript mantém strict: true. O aviso experimental de
node:sqlite no Node.js 24.12.0 não impediu os testes.

## Cenários verificados

| Cenário | Evidência |
| --- | --- |
| Telas reais | HTTP 200 em /admin.html e /cardapio.html; scripts servidos pelo Express executados em jsdom. |
| Categorias | Três categorias do SQLite; select usa nomes. Carregamento, falha de consulta e recuperação no DOM. |
| Cadastro | 201/ID para 0, 0,29, 8,90 e 8.90; JSON numérico, descrição vazia null. |
| Cardápio | Agrupamento por categoria, BRL (R$ 0,00 e R$ 0,29) e nenhum parágrafo de descrição null. |
| Validação local | Vazio, negativo, expoente, hexadecimal, casas excedentes e separadores repetidos rejeitados sem POST; campos preservados. |
| Correção após 400 | Erro real da API exibido; sem gravar; campos preservados, correção e novo cadastro bem-sucedido. |
| Cliques repetidos | Duas submissões durante POST pendente geram uma chamada e uma linha. |
| Resposta perdida | POST real retorna 201 e grava antes da falha simulada no fetch; aviso de incerteza, link de consulta, nenhum reenvio direto e uma linha. |
| Resposta truncada/incompleta | Falha ao ler JSON e 201 sem ID não apagam campos nem confirmam sucesso. |
| Estados de consulta | Carregamento, vazio, erro e recuperação de GET; estratégias por nome/valor testadas sem mutar a lista. |
| Persistência | Servidor compilado reiniciado com mesmo SQLite; itens, IDs e categorias preservados sem duplicação. |
| QR PNG/SVG | PNG 200 image/png; ambos os criadores produzem imagens decodificáveis para o mesmo destino. |
| Destino real | URL decodificada igual a CARDAPIO_URL, independente do Host; abre /cardapio.html real e seu script. Não há HTML temporário no teste. |
| Erros da API | 400 com {erro} sem inserir; falhas SQL e de QR retornam 500 genérico. |
| Comando de impressão | Evento load simulado habilita botão e clique invoca window.print uma vez, em stub de teste. |
| Configuração/MVC | URL validada antes de banco/porta; importar app não abre banco; caminhos src/dist independem da raiz de execução. |

A simulação de perda de resposta altera somente o fetch do DOM de teste; não há
endpoints de teste nem falhas introduzidas na aplicação. QR é rasterizado por
sharp e decodificado por jsqr, independentemente do encoder qrcode.

## Verificações pendentes

O controle do computador retornou serviço de acesso ao navegador indisponível e
canal nativo desconectado. Nenhum navegador controlável foi disponibilizado.
jsdom não calcula layout real nem comprova a renderização. Permanecem pendentes:

- Fluxo visual nas duas páginas em navegador real e exibição efetiva do QR.
- Layout em largura de celular (por exemplo, 390 px), incluindo transbordamentos.
- Prévia de impressão e impressão em papel; somente a invocação foi testada.
- Leitura do QR por câmera física e conectividade da rede Wi-Fi do usuário.

O README apresenta a demonstração no PowerShell: informar o IPv4 real mostrado
por ipconfig e configurar CARDAPIO_URL com esse IP, porta e /cardapio.html.
Não usar localhost ou um IP ilustrativo ao testar no celular.

Nenhum commit, push ou deploy foi realizado. Os servidores de teste foram encerrados.
