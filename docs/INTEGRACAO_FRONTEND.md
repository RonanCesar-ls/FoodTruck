# Integração do frontend existente

As telas estão em `public/admin.html` e `public/cardapio.html`, com CSS, logo e
JavaScript existentes preservados. O Express serve frontend e API na mesma origem;
não há proxy nem CORS adicional. As quatro rotas, MVC, services, repositories e
Singleton, Builder, Strategy e Factory Method continuam no fluxo real.

| Página/recurso | Chamadas relativas | Comportamento |
| --- | --- | --- |
| `/admin.html` | GET /api/categorias; POST /api/itens | Categorias reais, validação e resultado do cadastro. |
| QR no painel | GET /api/qrcode | PNG com carregamento, erro, nova consulta e botão de impressão. |
| `/cardapio.html` | GET /api/cardapio | Grupos por categoria, preços em BRL, descrição null omitida. |

`js/api.js` compartilha chamadas e funções; `js/admin.js` coordena o painel;
`js/cardapio.js` apresenta os itens. Textos usam textContent. Não foram adicionadas
rotas ou telas ao escopo.

## Entrada e resultado do cadastro

- Categoria é o nome retornado pela API, nunca ID ou objeto. Nome é obrigatório.
- Descrição é opcional; vazia ou apenas com espaços vira null.
- O campo de preço aceita 0, 0,29, 8,90 e 8.90. Valida dígitos e, opcionalmente,
  um separador e uma ou duas casas antes de converter a escrita para número.
- Vazio, negativo, expoente, hexadecimal, separadores repetidos e casas excedentes
  são rejeitados antes do POST, com mensagem e campos preservados.
- JSON envia valor numérico em reais. A API mantém a validação final e conversão
  para centavos inteiros seguros. Não enviar valorCentavos.

Exemplo para preço digitado 0,29 e descrição vazia:

```json
{"categoria":"Bebidas","nome":"Água","descricao":null,"valor":0.29}
```

Enquanto o POST está pendente, a variável enviando e o botão desabilitado bloqueiam
novas submissões. Um 201 com ID e nome válidos confirma o cadastro e limpa o formulário.
Um 400 apresenta o erro da API e mantém os campos; Voltar ao formulário permite
corrigir e fazer uma nova submissão intencional.

Falha de conexão, perda/erro de leitura da resposta ou sucesso incompleto são
resultados incertos. A tela avisa que o item pode ter sido gravado, preserva os
campos e oferece Conferir cardápio em uma aba separada. Não existe botão que repita
o último POST, cache de ultimoEnvio ou reenvio automático. Antes de iniciar um novo
envio manual, confira a listagem. Isso não cria idempotência no servidor: um novo
POST pode criar outra linha.

## Consultas, estados e QR

As novas tentativas de GET foram preservadas. Categorias mostram carregamento,
erro e recuperação; o cardápio mostra Carregando, Cardápio vazio, lista agrupada e
erro com Tentar novamente. Preços usam BRL; null não cria parágrafo de descrição.

O QR usa /api/qrcode como src da imagem e mantém erro/nova tentativa. O botão
Imprimir QR Code chama window.print(); as regras @media print existentes foram
preservadas. O destino vem de CARDAPIO_URL, com padrão local /cardapio.html.
Para celular, use o IPv4 real do computador, a porta e esse caminho, conforme README.

## Verificação desta execução

Os testes carregam HTML e scripts reais servidos pelo Express em jsdom, com fetch
para o servidor compilado e SQLite temporário. Conferem 201/ID, zero, vírgula/ponto,
categorias reais, BRL, descrição omitida, validação, estados/recuperação de GET,
bloqueio de cliques, correção após 400 e persistência após reinício.

A perda é simulada no fetch de teste somente depois de um POST real retornar 201
e ser gravado: a tela fica incerta, não oferece reenvio e há exatamente uma linha.
Também são cobertos corpo de resposta truncado e 201 incompleto. O teste de QR
decodifica o PNG e abre /cardapio.html real, sem criar HTML temporário.

jsdom não é navegador renderizado. Eventos de imagem e window.print são simulados;
não se confirmam imagem visível, layout móvel, prévia ou impressão em papel.
O serviço de navegador e o canal nativo estavam indisponíveis. Essas verificações
e a câmera física permanecem pendentes, separadas em VERIFICACAO.md.
