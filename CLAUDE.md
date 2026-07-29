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

## Estado: fase 1 concluída

Reescrita do `feira-app.html` (919 linhas, vanilla, arquivo único) como PWA
Svelte, **sem mudar uma conta**. Instalável, funciona offline a frio, fontes
próprias, service worker com fluxo de atualização por aviso. Lighthouse PWA
1.0. `feira-app.html` fica no repo como referência de comparação.

## Fase 2 — parser e dicionário testáveis (próxima)

O objetivo é fechar os defeitos abaixo, **cada um com teste falhando antes**.
A fase 1 portou a aritmética byte a byte de propósito, defeitos incluídos, pra
que o diff da reescrita fosse revisável contra os números antigos. Agora dá pra
mexer.

### Entregas

1. **Testes unitários** (`vitest` ou `node:test` — o que exigir menos
   configuração) sobre `parseNF.ts`, `prices.ts` e `quantity.ts`.
2. **Fixtures de pelo menos 3 layouts reais de nota**, cobrindo:
   - linhas por peso (`0,594 KG`);
   - itens repetidos que precisam agregar;
   - linhas de cabeçalho, total e pagamento que precisam ser ignoradas;
   - decimais pt-BR do tipo `1.052,80`.
3. **Fallback difuso** (sobreposição de tokens ou trigrama) pras descrições que
   não casam com o dicionário, no lugar da heurística de "três primeiras
   palavras" do `prettify`. Casamento de baixa confiança tem que **aparecer pro
   usuário confirmar**, não entrar calado na base de preço.
4. **Extrair parser e dicionário como módulos próprios** com fronteira clara —
   hoje `parseNF.ts` importa `DIC` direto, o que amarra os dois.

### Defeitos a corrigir, pior primeiro

**Preço / parser**

1. `src/lib/parseNF.ts:36` — `findIndex` pega o **primeiro** token que casa com
   `UNITS`. Na nota separada por espaço simples (linha 35), uma palavra da
   descrição ganha: `ARROZ BRANCO T1 PC 1KG 2,0 UN 5,29` casa em `PC`, a
   descrição vira `ARROZ BRANCO`, `qty` lê `T1` → NaN → 1, e o preço unitário lê
   `1KG` → **1,00**. Um arroz de R$ 1,00 aprendido em silêncio. Correção:
   varrer da direita pra esquerda e exigir vizinhos numéricos.
2. `src/lib/format.ts:4` — `toNum` remove todo `.`, então `1.052,80` → 1052.80
   (certo) mas `25.49` → **2549**. Qualquer nota com decimal por ponto envenena
   a base. Correção: decidir o separador pelo último que aparece no token.
3. `src/lib/prices.ts:49` — a média corrida nunca envelhece e `n` cresce sem
   limite. Depois de 20 notas, um preço novo entra com peso 1/20, e um aumento
   real leva meses pra chegar no número que você usa pra orçar. Correção: EWMA
   (α ≈ 0,3) ou janela limitada, mais um `lastSeen` pra sinalizar preço velho.
4. `src/lib/prices.ts:34,49` — o recálculo ignora a unidade. `Queijo coalho`
   registrado uma vez a R$ 42,49/kg e outra a R$ 17,00/un vira uma média sem
   significado. Correção: chavear a base por `nome + unidade`, ou recusar
   mistura de unidades.
5. `src/lib/prices.ts:35` — dentro de uma nota só, `agg[name].sum += r.unitPrice`
   faz média **sem ponderar pela quantidade**: 0,5 kg a 40 e 2 kg a 44 dá 42, e
   não 43,20.

**Quantidade / perda ao cozinhar**

6. `src/lib/steps/List.svelte`, com o rótulo vindo de `FREQ` em
   `src/lib/dic.ts:91` — item com `freq: 'semana'` mostra a quantidade **do
   mês** embaixo de um cabeçalho que diz "toda semana". A banana do exemplo é 5 kg, então a lista lê como 5 kg por
   ida ao mercado — 4× o orçado. `qty` é mensal, isso está decidido. Correção:
   mostrar `qty ÷ idas` por ida, com o número do mês como nota.
7. `src/lib/quantity.ts:9` — `sugQty` divide por 2 (`cfg.pessoas / 2`), então
   `DIC.pp` é quantidade mensal **por casal**, não por pessoa como o nome
   sugere. Correção: renomear o campo ou dividir os valores por 2. Código e
   documentação têm que concordar.
8. `src/lib/quantity.ts:19` — uma única `cfg.loss` global pra todo item que
   "cozinha e reduz". A conversão `qty / (1 - perda)` está certa, mas os
   rendimentos reais divergem (peito de frango ~25%, peixe ~15-20%, carne moída
   ~30%) e arroz **ganha** peso. Correção: override por item, caindo em
   `cfg.loss` como padrão.
9. `src/lib/quantity.ts:20` — `loss = 100` faz `f = 0` e a função devolve a
   quantidade cozida em silêncio. `toCfg` já limita a 90 na importação
   (`state.svelte.ts:34`), mas o `max="90"` do input é só validação de
   formulário: digitar 100 na tela passa. Correção: limitar no cálculo, não na
   borda.
10. `src/lib/steps/ItemCard.svelte` — o campo se chama `Qtd/mês` sem dizer que é
    peso **cozido** quando `cook` está ligado, enquanto a lista final fala "peso
    cru". Um número, dois significados, nada na tela diz qual. Conferir também a
    intenção do exemplo: `Filé de frango` 4 kg com `cook` ligado hoje manda
    comprar 5,3 kg.

**Integridade de dado**

11. `src/lib/format.ts:13` + `src/lib/quantity.ts` — `checks` é chaveado por
    `nid()`, id aleatório regerado a cada re-seed ou reimportação, então
    recarregar o template órfã toda marcação de compra. Já resolvido **só** pro
    backup gerado por `tools/gerador-to-backup.mjs`, que usa slug do nome.
    Correção geral: chavear por slug estável do nome do item.

Fechados na fase 1: exportação levava só o mês aberto (`64d34b7`); `cfg`
importado sem validação, que espalhava NaN pelas quantidades (`toCfg`).

## Fase 3 — sincronizar entre aparelhos (proposta antes de código)

Duas pessoas, uma lista, os mesmos check-marks. Restrições dadas:

- tier grátis serve, **sem servidor pra manter**;
- o app continua funcionando **totalmente offline e sem conta** — sincronizar é
  opt-in, camada em cima;
- **edição concorrente é o caso normal**, não a exceção: duas pessoas riscando
  itens no mesmo mercado ao mesmo tempo. Tratar explicitamente.

Nada de código antes de a abordagem ser aprovada.

## Limpezas de UX (quando sair barato)

- busca/filtro no editor e categorias que colapsam;
- categorias renomeáveis, adicionáveis e reordenáveis pelo usuário, no lugar do
  `CATORDER` fixo em `src/lib/dic.ts` (consumido por `src/lib/group.ts`);
- gasto por categoria na lista final;
- comparação de gasto mês a mês, a partir do histórico guardado;
- Web Share API no "copiar como texto" e na exportação, pra funcionar no
  celular.
