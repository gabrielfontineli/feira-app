# Diagnóstico de UX — o que atrapalha hoje

Levantamento, não proposta fechada. Você apontou três incômodos (ordem dos
corredores, onboarding, densidade da lista) sem um caso concreto para nenhum.
Isto lê as telas e nomeia o atrito, com o custo de cada correção, para a escolha
do que fazer ser sua e não minha.

Nada aqui foi implementado.

Base de medida: o dataset de exemplo (`src/lib/example.ts`), 67 itens — 35 de
compra mensal sem cozimento, 14 quinzenais, 13 semanais, 5 mensais que cozinham,
e 34 com observação preenchida.

---

## 1. Densidade da lista — o mais barato e o mais sentido

`src/lib/steps/List.svelte`, o bloco `.item`.

Cada linha carrega hoje seis coisas: caixa de marcar, nome, `noteLabel`,
`qtyLabel`, etiqueta de frequência e preço estimado.

### 1.1 A segunda linha aparece em quase todo item

`noteLabel` (`List.svelte:42`) junta até três informações com ` · `:

```
5 kg no mês · peso cru · rende 4 kg cozido · preço estimado
```

Ela aparece quando o item tem mais de uma ida no mês, ou cozinha, ou tem
observação. No exemplo isso dá **51 dos 67 itens** — a exceção é a regra. E o
conteúdo dela é de planejamento: o total do mês e o rendimento cozido são
números para decidir em casa, não para decidir na gôndola.

**Correção barata:** a segunda linha só aparece no item marcado, ou atrás de um
toque no próprio item. O peso cru já está no número grande; o resto é conferência.
Uma condição no template. Risco: zero, é só apresentação.

### 1.2 A lista reflui embaixo do polegar

O campo de preço (`List.svelte:178`) nasce **depois** de marcar. Marcar o
terceiro item de uma categoria empurra todos os seguintes uns 44 px para baixo,
no meio do corredor, com uma mão. Foi uma decisão deliberada e boa — a lista não
vira parede de inputs —, mas o efeito colateral não foi pago.

**Correção barata:** reservar a altura do campo desde o começo (o espaço fica
vazio até marcar), ou o campo abrir sobreposto em vez de empurrar. CSS.

**Correção melhor e mais cara:** o campo de preço sai da linha e vira um passo
de fechamento — "conferir o que você pagou" — depois da compra. Aí a lista no
mercado é só marcar, e digitar preço acontece sentado. Mexe no fluxo, precisa
de conversa antes.

### 1.3 Informação que compete pelo canto direito

`qtyLabel` e o preço dividem a mesma coluna, um em cima do outro
(`List.svelte:163-171`), mais a etiqueta de frequência ao lado da quantidade.
No mercado o preço estimado não é acionável: ele serve ao orçamento, que já está
no bloco grudento do topo. A etiqueta de frequência idem — ela já está embutida
no "por ida".

**Correção barata:** tirar as duas da linha e deixar o canto direito só com a
quantidade da ida. O total continua no topo. Uma linha no template cada.

### 1.4 O que está certo e não vale mexer

- A linha inteira é o botão de marcar (`.tick`), com 24 px de caixa. Alvo bom.
- Item marcado não muda de lugar. É o que deixa decorar onde as coisas estão.
- O agrupamento por categoria com contador `n/total` na dobra.
- Nenhum campo abaixo de 16 px, por causa do zoom do Safari.

---

## 2. Ordem dos corredores

`CATORDER` fixo em `src/lib/dic.ts:98`, consumido por `src/lib/group.ts:16` e
por `src/lib/steps/ItemCard.svelte:74`.

### 2.1 Um buraco novo, criado pelo Markdown

`byCategory` **preserva** categoria desconhecida (joga para o fim), mas o
`<select>` de categoria do editor só lista `CATORDER`. Um item que chegou por
`.md` com `## Padaria fina` mostra o select em branco, e encostar nele troca a
categoria por outra sem aviso.

**Corrigido junto deste diagnóstico**, porque era perda silenciosa de dado
criada pelo Markdown: o select passa a listar `CATORDER` mais as categorias em
uso.

```svelte
{#each [...new Set([...CATORDER, ...feira.itens.map((i) => i.cat)])] as c (c)}
```

### 2.2 Reordenar sem renomear: metade do valor, um quinto do custo

O spec 2 acordado é categorias renomeáveis, adicionáveis e reordenáveis. Isso
mexe em `Item.cat` de todo item salvo e pede migração, entra no backup, no
`.md` e no `check:`/`pago:` por slug. É o item mais caro da lista de limpezas.

Mas o que resolve andar pelo mercado é só a **ordem**. Guardar
`cfg.ordem: string[]` e fazer `byCategory` lê-la em vez da constante:

- nenhuma migração — a lista vazia significa "usa o `CATORDER`", e categoria
  fora dela já cai no fim hoje;
- não mexe em `Item.cat`, então marcações, backup e `.md` ficam como estão;
- a tela é arrastar cinco a dez chips em ajustes, ou dois botões ↑/↓.

Renomear e criar continua fora, e continua caro. Recomendação: fazer a ordem,
adiar o resto até doer.

---

## 3. Onboarding

### 3.1 Os números do nav mentem depois do primeiro uso

`src/lib/Steps.svelte` numera `1 início · 2 dieta · 3 itens · 4 lista · backup`.
Depois que existe dado, `App.svelte:24` já abre direto na lista, e a navegação
é livre — mas os números continuam ensinando "tem que ir em ordem". O passo da
nota fiscal, aliás, já saiu do nav e o índice dele continua sendo 1, o que só
piora a leitura de quem tenta contar.

**Correção barata:** mostrar os números só enquanto `!feira.cfg.started`. Dois
caracteres de condição, e o nav vira o que ele já é na prática: abas.

### 3.2 "Começar do zero" desemboca na dieta

Em `src/lib/steps/Start.svelte:89`, o botão primário é **Continuar →**, que vai
para o passo 2, colar a dieta. Quem escolheu começar do zero por não ter plano
alimentar cai numa caixa de texto que não sabe preencher; a saída existe, mas é
o botão fantasma ao lado (**Ir pra lista**), que é justamente o menos visível.

**Correção barata:** o destino do primário depender da escolha feita — quem veio
do "zero" vai para os itens (passo 3) ou para a lista; quem veio do exemplo, ou
tem dieta, segue para a dieta. Uma variável no `Start.svelte`.

### 3.3 Texto desatualizado

`Start.svelte:51` dizia "Tem um arquivo **.json** exportado antes?" depois de o
seletor passar a aceitar `.md` também. Imprecisão introduzida na fase de
Markdown, **corrigida junto deste diagnóstico**.

### 3.4 Um passo com duas identidades

O passo 0 é "como você quer começar?" antes de escolher e "ajustes" depois
(`Start.svelte:29`/`:56`). Funciona, e é o que o app antigo fazia. Mas o rótulo
do nav diz "início" e o conteúdo, para quem já usa, é permanentemente a tela de
ajustes. Renomear o passo para **ajustes** depois de `started` custa a mesma
condição do item 3.1 e diz a verdade.

---

## 4. Ordem sugerida, do mais barato ao mais caro

| # | O quê | Custo | Por que agora |
|---|---|---|---|
| ~~1~~ | ~~Select de categoria inclui as em uso (2.1)~~ | feito | Perda silenciosa de dado |
| ~~2~~ | ~~Texto do `.json`/`.md` no início (3.3)~~ | feito | Estava errado |
| 3 | Números do nav só antes de começar (3.1, 3.4) | 2 condições | Ensina o modelo mental errado |
| 4 | Linha da lista mais magra (1.1, 1.3) | template | O incômodo diário |
| 5 | Lista não reflui ao marcar (1.2) | CSS | O incômodo diário |
| 6 | Destino do "Continuar" segue a escolha (3.2) | 1 variável | Só pega quem não tem dieta |
| 7 | `cfg.ordem` para os corredores (2.2) | 1 tela + `group.ts` | Precisa de tela nova |
| 8 | Renomear/criar categoria (spec 2) | migração | Adiar até doer |

Os 1 e 2 já foram: eram consequência direta do Markdown, não escolha de UX. Os
3 a 6 cabem num commit cada e não mexem em nenhuma conta. O 7 mexe só em
apresentação. O 8 é o único que toca dado salvo.

---

## 5. O que este diagnóstico deliberadamente não olhou

- **Acessibilidade** além do alvo de toque e do zoom do iOS. Vale uma passada
  separada com leitor de tela, e não é isso que você pediu.
- **A tela de itens** (`Editor.svelte`), que é de planejamento em casa, não de
  mercado. Ela tem seus próprios atritos — o card aberto tem cinco campos numa
  grade que quebra em duas colunas no celular — mas nenhum deles é o que
  incomoda no corredor.
- **A conta de quantidade.** Está fechada desde a fase 2 e nada aqui a toca.
