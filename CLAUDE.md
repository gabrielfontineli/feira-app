# Feira — instruções do projeto

App de lista de mercado do mês pra uma casa. Monta a lista a partir de (a) um
plano alimentar de nutricionista colado como texto e (b) o texto de notas
fiscais de compras passadas, que ensina os preços de referência. Offline-first,
sem cadastro, sem servidor: o dado nunca sai do aparelho.

Svelte 5 + TypeScript + Vite, PWA instalável. No ar em
<https://gabrielfontineli.github.io/feira-app/> (repo privado, site público).

## Acordo de trabalho

Isto vale mais que qualquer preferência de estilo:

- **Pergunte antes de introduzir framework ou build step mais pesado que o
  Vite.** O valor de a coisa ser pequena é real.
- **Commits pequenos e revisáveis, com mensagem clara.** Ao fim de cada fase,
  diga como rodar e testar localmente.
- **Não invente features que não foram pedidas.** Se achar que falta algo,
  proponha primeiro.
- **Aponte o que está de fato errado** no código — não o que está fora de moda.
  Em especial na conta de quantidade, na conversão de perda ao cozinhar e na
  média corrida de preço: são os números usados pra decidir compra.
- **Fase 3 exige proposta aprovada antes de qualquer código.**

## Convenções

- **UI em português do Brasil**, moeda BRL. Não traduzir.
- **Comentários e mensagens de UI em pt-BR. Mensagens de commit em inglês.**
- **Identidade visual é deliberada, não template**: paleta sage/creme com
  acento coral, títulos em Fraunces, corpo em Inter, números em Space Mono.
  Fontes são auto-hospedadas em `src/fonts/` — nada de origem terceira.
- Tokens de design, primitivas compartilhadas e as regras de `@media print`
  ficam globais em `src/app.css`. Regra de um componente só vai no `<style>`
  dele. Print precisa ser global pra sobreviver ao escopo do Svelte.
- Lógica pura em `src/lib/*.ts`, sem tocar em DOM — é o que torna teste
  possível.

## Comandos

```bash
npm run dev            # http://localhost:5173
npm run build && npm run preview
npm run check          # svelte-check, tem que ficar limpo
npm test               # vitest, unidade sobre src/lib/*.ts
npm run test:watch     # o mesmo, em watch
npm run check:parity   # as contas continuam iguais às do feira-app.html
node tools/smoke.mjs   # ponta a ponta no Chrome real (precisa do preview no ar)
npm run deploy         # build + push do dist/ pra branch gh-pages
```

`APP_URL=<url> node tools/smoke.mjs` roda o smoke contra o site publicado.

O service worker exige `http://localhost` ou HTTPS: abrir `dist/index.html` por
`file://` renderiza mas nunca registra o worker.

## Privacidade

O repositório não contém dado pessoal, e é assim que fica.

- `gerador-lista.html` e `feira-backup-*.json` estão no `.gitignore`. Contêm a
  lista real, os preços, o orçamento e notas nomeando gente da casa. São
  **entrada**, não código-fonte. Nunca versionar.
- O dataset de exemplo que vai no bundle é anonimizado. Se editar
  `src/lib/example.ts`, mantenha assim.
- Nada de default com número pessoal. `vale = 0` significa "não informado".
- Em execução: só `localStorage`, sem analytics, sem fonte ou script de
  terceiro.

Antes de qualquer push, vale varrer: `git grep -nE '\b(nome|2200)\b'`.

## Estado: fase 2 concluída

**Fase 1** reescreveu o `feira-app.html` (919 linhas, vanilla, arquivo único)
como PWA Svelte, **sem mudar uma conta**. Instalável, funciona offline a frio,
fontes próprias, service worker com fluxo de atualização por aviso. Lighthouse
PWA 1.0. `feira-app.html` fica no repo como referência de comparação.

**Fase 2** fechou os onze defeitos de conta, um commit por defeito, cada um com
teste falhando antes. 67 testes em `src/lib/*.test.ts`.

`npm run check:parity` continua passando: nada na fase 2 mudou a aritmética do
dataset de exemplo, então a comparação com o app antigo segue valendo como
auditoria. Se um dia um número do exemplo mudar de propósito, o valor antigo e o
defeito que causou a mudança vão no comentário — não apague a asserção.

### Como a fase 2 ficou

Módulos, com fronteira: `parseNF.ts` lê colunas e não conhece o dicionário;
`match.ts` decide de que produto a linha fala e não conhece o formato da nota;
`dic.ts` é só dado; `checks.ts` é a chave de marcação; `prices.ts` faz a conta
de preço.

Decisões que valem saber antes de mexer:

- **`toNum`** decide o decimal pelo último separador do token. `1.052` vale
  1,052 e não 1052 — aceitável porque os campos lidos da nota são quantidade e
  preço unitário, onde valor acima de mil não existe. Também é estrito: `1KG`
  vira NaN, não 1.
- **Média de preço é EWMA com α = 0,3**, uma observação por nota, e cada entrada
  guarda `lastSeen`. `n` sobrevive só pra ler base antiga.
- **Unidade incompatível não entra na média.** A comparação é peso versus peça,
  não literal: 'bandeja' contra 'cx' não é conflito, 'kg' contra 'un' é. Volta
  em `conflitos` e a tela avisa.
- **Casamento difuso é trigrama (Dice) em janela de palavras**, limite 0,55, e
  **nunca entra na base sem confirmação** — vira `pendentes` e a tela pergunta.
  O `prettify` sobrou só pra nomear produto de fato novo, que é o que ele sabe
  fazer.
- **`DIC.pp` virou `DIC.pp2`**: é quantidade mensal pra 2 pessoas, e o nome
  antigo sugeria por pessoa.
- **Perda ao cozinhar é por item**, caindo em `cfg.loss`. Override só onde o
  rendimento real difere dos 25% padrão (peixe 18, moída 30). O limite de 90%
  mora dentro de `rawQty`, não na borda do formulário.
- **`qty` continua mensal.** A lista mostra `qty ÷ idas` por ida, e as idas saem
  de `freq` + `cfg.dias` (semana = dias/7, quinzena = dias/15), sem campo novo.
- **Marcação de compra é chaveada por slug do nome**, não por `id`. Mesmo
  algoritmo de `tools/gerador-to-backup.mjs`. Renomear um item leva as marcações
  dele junto, e dois itens de mesmo nome dividem marcação: aceito e escrito em
  `checks.ts`.

### O que ficou aberto de propósito

- O exemplo mantém a perda global nos itens que cozinham. Aquelas quantidades
  são a lista real de uma casa, e sobrescrever seria adivinhar pelo usuário.
  Vale conferir com quem usa: `Filé de frango` 4 kg com `cook` ligado manda
  comprar 5,3 kg — a intenção era 4 kg cru ou 4 kg cozido?
- `matchDic` ainda casa pela primeira palavra-chave que aparece na descrição, e
  a ordem do `DIC` decide empate. 'CREME DE LEITE' casa em `leite`. Não é
  regressão, é o comportamento de sempre, e o casamento difuso não ajuda porque
  o literal ganha antes.

## Preço vem da lista, não da nota

O caminho principal pra aprender preço é digitar o **preço unitário** ao riscar
o item na lista. A nota fiscal virou importação em lote, fora do wizard,
alcançável pelo backup.

Por quê, com o que a pesquisa fechou (julho de 2026):

- **O QR Code da NFC-e não tem os itens.** Carrega `chNFe`, `nVersao`, `tpAmb`,
  `cDest`, `dhEmi`, `vNF`, `vICMS`, `digVal`, `cIdToken`, `cHashQRCode`. Total
  da nota, sim; preço unitário por produto, não.
- **Nenhuma SEFAZ manda CORS.** Conferido em MG, SP e RS: sem
  `access-control-allow-origin`, `fetch` do navegador é bloqueado. Contornar
  exige proxy — servidor pra manter e a chave da nota saindo do aparelho.
- **RN, que é o caso de uso:** `nfce.set.rn.gov.br` serve certificado que cobre
  só `*.sefaz.rn.gov.br` e o navegador barra. O host bom,
  `nfce.sefaz.rn.gov.br/portalDFE/NFCe/ConsultaNFCe.aspx`, tem captcha
  (`txt_cod_antirobo`) e `__VIEWSTATE` de WebForms.
- **iPhone não tem `BarcodeDetector`.** WebKit não implementa.

Não reabrir "ler o QR code" sem que um destes quatro tenha mudado.

Decisões que valem saber:

- **`registrarPago` guarda o `PriceEntry` anterior.** A EWMA é exponencial:
  corrigir um valor digitado errado sem desfazer o anterior deixaria o preço de
  orçar entre os dois. Corrigir restaura e refunde. O teste que prova isso é
  "corrigir o valor digitado não conta duas vezes na média" — não apague.
- **`Pago.prevPrice`** existe porque item criado à mão pode ter preço sem nunca
  ter entrado na base; sem ele, apagar o campo zerava esse preço.
- **`pagos` é por mês**, chave `pago:AAAA-MM`, mesma chave por slug das
  marcações, e entra no backup como campo opcional.
- **Nenhum campo abaixo de 16px** em `src/app.css`: o Safari do iOS dá zoom no
  campo em foco e o layout pula.
- O passo da nota continua sendo o índice 1. O `Steps.svelte` só o omite do nav,
  pra não renumerar todo `go(n)`.

## A lista, depois da repaginação

Spec em `docs/superpowers/specs/2026-07-30-lista-ux-design.md`.

- **`suggest.ts` usa o `DIC` pra montar lista**, não só pra ler nota. Ranking é
  exato → prefixo → substring: `maca` inteiro é a maçã, não o macarrão.
  De propósito **não** aplica `allowed()` — os interruptores de limpeza,
  higiene e extras filtram o que o app sugere sozinho; aqui foi você que
  digitou o nome.
- **`AddItem.svelte` serve as duas telas** por uma prop `modo`. No mercado ele
  vive dentro do `.summary` grudento, colapsado num `<details>` nativo; no
  planejamento nasce aberto. Os botões `hoje`/`mês` ficam na linha da sugestão
  pra adicionar continuar sendo um toque.
- **`Item.soHoje` ('AAAA-MM') é o avulso da ida.** Some sozinho no mês seguinte,
  sem varredura. Escolhido em vez de armazenamento paralelo porque um `Item`
  comum já atravessa `itemCost`, `byCategory`, o backup e as chaves por slug.
  Quem filtra é `feira.naLista()` — use ela, não `i.on`, em qualquer total.
- **A lista agrupa por categoria**, não por frequência: no mercado você anda por
  corredor. `byCategory` já existia e já respeitava `CATORDER`; só estava sendo
  chamado um nível fundo demais. Frequência virou etiqueta (`FREQ[f].s`) e
  continua mandando em `qtyPorIda`.
- **Item marcado fica no lugar.** Ordem estável é o que deixa decorar onde as
  coisas estão. Não reordenar ao marcar.
- Avulso de mês passado continua em `feira.itens`, visível e apagável no editor.
  Sem limpeza automática: seria apagar dado do usuário pelas costas.

## Fase 3 — sincronizar entre aparelhos (proposta antes de código)

Duas pessoas, uma lista, os mesmos check-marks. Restrições dadas:

- tier grátis serve, **sem servidor pra manter**;
- o app continua funcionando **totalmente offline e sem conta** — sincronizar é
  opt-in, camada em cima;
- **edição concorrente é o caso normal**, não a exceção: duas pessoas riscando
  itens no mesmo mercado ao mesmo tempo. Tratar explicitamente.

Nada de código antes de a abordagem ser aprovada.

## Limpezas de UX (quando sair barato)

- categorias renomeáveis, adicionáveis e reordenáveis pelo usuário, no lugar do
  `CATORDER` fixo em `src/lib/dic.ts` (consumido por `src/lib/group.ts`). É o
  spec 2 já acordado: mexe em `Item.cat` de todo item salvo e pede migração;
- gasto por categoria na lista final;
- comparação de gasto mês a mês, a partir do histórico guardado;
- Web Share API no "copiar como texto" e na exportação, pra funcionar no
  celular.
