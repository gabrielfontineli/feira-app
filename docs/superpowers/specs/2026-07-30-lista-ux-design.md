# Repaginar a lista e tornar fácil adicionar item

Data: 2026-07-30 · Estado: aprovado, à espera do plano de implementação

## Problema

Duas telas, duas dores diferentes, e uma causa comum: o dicionário só é usado
pra ler nota fiscal, nunca pra ajudar a montar a lista.

**No mercado** (passo 4, `List.svelte`). Você lembra de algo no corredor e não
tem como adicionar: precisa sair da lista, ir em *itens*, achar o card `Novo
item` que nasceu no topo e preencher seis campos. Além disso a lista agrupa por
**frequência** (mês / 15 dias / semana) e só dentro dela por categoria — mas
você anda pela loja por seção, não por frequência.

**Em casa** (passo 3, `Editor.svelte`). 62 cards, seis campos sempre visíveis
cada, sem busca. Achar um item é rolagem cega.

## Escopo

Este spec cobre busca, cards colapsados, lista por categoria e o adicionar
inteligente.

**Fora deste spec, e de propósito:** categorias renomeáveis, criáveis e
reordenáveis pelo usuário. Mexe em `CATORDER` (`src/lib/dic.ts`), em
`src/lib/group.ts`, no `cat` de todo item já salvo, e pede migração de dados.
Vai num spec próprio depois deste.

## Desenho

### 1. `suggest.ts` — a peça nova

Módulo puro, sem DOM, testável, no padrão de `src/lib/*.ts`.

```ts
export interface Sugestao {
  /** Nome que o item vai receber. */
  name: string;
  /** Entrada do dicionário, quando veio de lá. Null: texto livre. */
  entry: DicEntry | null;
  /** Item que já existe na lista com este nome. Não criar outro. */
  existente: Item | null;
}

export function sugerir(q: string, itens: Item[], limite = 5): Sugestao[];
```

Regras:

- compara com `norm()` de `src/lib/format.ts` — minúscula, sem acento;
- casa contra `DicEntry.n` e contra cada palavra de `DicEntry.k`;
- ordena: quem começa com a busca vem antes de quem só a contém;
- entrada do dicionário que já virou item na lista volta com `existente`
  preenchido, pra tela oferecer "já está lá" em vez de duplicar. A comparação é
  `norm(item.name) === norm(sugestao.name)`, a mesma que `Receipt.svelte` usa
  pra achar o item de um preço aprendido;
- **não** aplica `allowed()`: os interruptores de limpeza / higiene / extras
  filtram sugestão automática, e aqui foi você que digitou o nome;
- busca sem nenhum casamento devolve uma sugestão de texto livre com
  `entry: null`.

Testes: casa por palavra-chave (`peito fgo` → Filé de frango), casa por nome,
prefixo antes de substring, marca existente, texto livre quando nada casa,
respeita o limite.

### 2. `AddItem.svelte` — um componente, duas telas

Um `<input type="text">` e a lista de sugestões abaixo. Cada sugestão mostra o
que o item vai virar, porque o dicionário decide muita coisa por você:

```
┌ + adicionar ─────────────────────────┐
│ banan                                │
├──────────────────────────────────────┤
│ Banana                               │
│ Frutas · 1,2 kg/sem · R$ 5,99       │
│                        [hoje] [mês]  │
│ Banana passa                         │
│ Extras · 0,3 kg/mês · sem preço     │
│                        [hoje] [mês]  │
└──────────────────────────────────────┘
```

Criar o item é **um toque**, não três: os dois botões vivem na própria linha da
sugestão. Reúso direto de `src/lib/quantity.ts`, sem lógica nova:

- sugestão do dicionário → `itemFromDic(entry, cfg, base)`, que já resolve
  categoria, unidade, frequência, `sugQty()` pela sua casa e `priceOf()` da base
  de preços;
- texto livre → `itemFromLine(name, base)` (Outros, `un`, mês, qty 1);
- sugestão com `existente` → em vez dos dois botões, um "já está na lista", que
  liga o item se ele estiver desligado.

Props: `modo: 'mercado' | 'planejamento'`. No planejamento não existe "só hoje"
— você está montando o mês — então sai um botão e fica "adicionar".

### 3. `Item.soHoje` — o avulso da ida

Campo novo, opcional: `soHoje?: string`, no formato `AAAA-MM`.

- `hoje` grava o mês aberto; `mês` deixa o campo vazio;
- a lista mostra o item quando `!soHoje || soHoje === mês aberto`. Mês que vem
  ele some sozinho, sem varredura nem job de limpeza;
- `Editor.svelte` mostra os avulsos com uma etiqueta, e apagar ou promover a
  fixo (limpar o campo) é edição normal de item.

Escolhido em vez de um armazenamento paralelo `avulso:AAAA-MM` porque um `Item`
comum já atravessa `itemCost`, `byCategory`, o backup e as chaves de marcação e
de preço por slug. Nada disso precisa saber que o item é de um mês só.

Custo aceito e conhecido: avulso de mês passado continua em `feira.itens`
ocupando espaço. Fica visível e apagável no editor; sem limpeza automática, que
seria apagar dado do usuário pelas costas.

### 4. Lista por categoria

`byCategory()` de `src/lib/group.ts` já faz o agrupamento e já respeita
`CATORDER`. Hoje `List.svelte` o chama *dentro* de cada seção de frequência; a
mudança é chamá-lo no topo e trocar o que é seção pelo que é etiqueta.

```
Frutas                          3/7
────────────────────────────────────
 ☑  Banana            1,2 kg  · sem
 ☐  Tomate            0,8 kg  · sem
 ☐  Cebola            2 kg    · mês

Proteínas                       0/4
────────────────────────────────────
 ☐  Filé de frango    5,3 kg  · mês
 ☐  Carne moída       2 kg    · 15d
```

- cabeçalho de categoria colapsável, com contador `marcados/total` — o colapso
  hoje é por frequência e passa a ser por categoria;
- frequência vira etiqueta na linha (`sem`, `15d`, `mês`). Continua mandando na
  conta: `qtyPorIda()` e `idasNoMes()` não mudam nada;
- item marcado **fica no lugar**, riscado como hoje. A ordem estável é o que
  deixa você decorar onde as coisas estão no corredor; item que pula de posição
  ao ser marcado faz você perder o lugar;
- o `AddItem` em modo mercado entra no bloco `.summary`, que já é
  `position:sticky`. Colapsado é uma linha fina "+ adicionar"; abre no toque.
  Sem botão flutuante, sem modal, sem folha — e o alcance do polegar sai de
  graça do sticky que já existe.

A leitura "compra grande × reposição", que hoje sai do agrupamento por
frequência, não se perde: ela já vive nos totais de `Editor.svelte`.

### 5. Editor

- busca no topo, filtrando `feira.itens` por `norm(name)` enquanto você digita;
- `ItemCard.svelte` nasce colapsado: uma linha com interruptor, nome,
  quantidade, preço e frequência. Toca e abre os seis campos de hoje, sem
  mudança nenhuma neles;
- `add()`, que cria `Novo item` em branco, é substituído pelo `AddItem` em modo
  planejamento.

## O que não muda

Nenhuma conta. `quantity.ts`, `prices.ts`, `parseNF.ts` e `match.ts` ficam
intactos — `npm run check:parity` tem que continuar passando, e é o que prova.

## Verificação

Testes novos em `src/lib/suggest.test.ts`, nos casos listados na seção 1.

```bash
npm test
npm run check
npm run check:parity   # nenhuma conta mudou; se quebrar, algo saiu do lugar
node tools/smoke.mjs   # com o preview no ar
```

`tools/smoke.mjs` referencia `.item .tick` e `.item .paid input`; a
reestruturação da lista precisa manter essas classes ou atualizar o smoke.

À mão, no iPhone:

- na lista, abrir "+ adicionar", digitar `banan`, tocar `hoje`, e conferir que o
  item nasce em Frutas com quantidade e preço preenchidos;
- avançar o mês e conferir que o avulso sumiu, e que o marcado como `mês` ficou;
- colapsar uma categoria e conferir o contador;
- em itens, buscar `frango` e conferir que o card abre e fecha.
