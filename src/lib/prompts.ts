/*
 * Os pedidos prontos pra levar a uma LLM. São texto, não código: ficam juntos
 * aqui pra dar pra ler os quatro de uma vez e ver que pedem a mesma coisa.
 *
 * Cada um tem um contrato com um parser deste app, e mudar o prompt sem olhar o
 * parser quebra a importação em silêncio:
 *
 * - DIETA e CARDAPIO -> `Diet.svelte`, um ingrediente por linha;
 * - NOTA             -> `parseNF.ts`, colunas separadas por tabulação;
 * - LISTA_MD         -> `md.ts`, o formato Markdown do app.
 */

/** O que sai do aparelho quando você leva um destes pra uma LLM. */
export const AVISO =
  'O app não manda nada pra lugar nenhum — mas levar seu arquivo pra uma LLM manda o dado pra ela. É uma escolha sua, feita fora daqui.';

/*
 * Plano de nutricionista vem em PDF, dividido por refeição, com quantidade em
 * grama e várias alternativas por prato. O que este passo aceita é uma coisa
 * bem mais simples: um ingrediente por linha. Traduzir de um pro outro na mão
 * é chato, então aqui vai o pedido pronto pra jogar numa LLM junto com o PDF.
 *
 * O que o texto exige é o que o app precisa: nome genérico de supermercado
 * (é o que `DIC` reconhece), sem quantidade (quem calcula a do mês é o
 * `sugQty`, a partir de pessoas e dias), e sem repetição.
 */
export const DIETA = `Anexei o meu plano alimentar. Monte a lista de compras dele.

Formato da resposta:
- um ingrediente por linha, e nada mais: sem título, sem introdução, sem
  comentário no fim, sem marcador, sem numeração;
- sem quantidade e sem unidade — só o nome do ingrediente;
- nome genérico de supermercado, em português do Brasil: "frango grelhado" vira
  "filé de frango", "2 fatias de pão integral" vira "pão de forma integral",
  "Whey Growth 900g" vira "whey protein";
- cada ingrediente aparece uma vez só, mesmo que esteja em várias refeições ou
  em vários dias;
- quando o plano oferece alternativa ("ou"), todas as opções entram;
- inclua o que se compra no mercado e é usado no preparo: azeite, tempero, café,
  açúcar ou adoçante;
- deixe de fora o que não se compra na feira: água, suplemento manipulado,
  horário de refeição, orientação e observação do nutricionista.

Responda só com a lista.`;

/*
 * Mesma saída contratada do DIETA, entrada diferente: cardápio da semana,
 * receita salva, print de bloco de notas. Cai no mesmo `cross()`.
 */
export const CARDAPIO = `Vou te passar o cardápio/as receitas da semana. Monte a lista de compras.

Formato da resposta:
- um ingrediente por linha, e nada mais: sem título, sem introdução, sem
  comentário no fim, sem marcador, sem numeração;
- sem quantidade e sem unidade — só o nome do ingrediente;
- nome genérico de supermercado, em português do Brasil: "1 xícara de farinha
  de trigo" vira "farinha de trigo", "queijo parmesão ralado" vira "queijo";
- cada ingrediente aparece uma vez só, mesmo que esteja em várias receitas;
- inclua o básico de preparo que a receita pede: óleo, sal, alho, cebola,
  tempero;
- deixe de fora água, gelo e o que já é utensílio ou modo de fazer.

Responda só com a lista.`;

/*
 * O prompt mais valioso do conjunto: hoje o atrito da importação em lote é
 * conseguir o texto da nota. O contrato tem que casar com o `parseNF`, que
 * procura a coluna de unidade e pega o número de cada lado dela. Tabulação, e
 * não espaço, porque o parser tenta `\t+|\s{2,}` antes de cair pro espaço
 * simples — e descrição com espaço no meio é a regra, não a exceção.
 */
export const NOTA = `Anexei a foto (ou o PDF) de um cupom fiscal de supermercado. Transcreva os itens.

Formato da resposta:
- uma linha por item, e nada mais: sem título, sem cabeçalho de coluna, sem
  introdução, sem comentário no fim, sem marcador, sem numeração;
- quatro campos por linha, separados por TABULAÇÃO (não por espaço):
  descrição<TAB>quantidade<TAB>unidade<TAB>preço unitário
- a descrição é a do cupom, como está escrita, abreviação e tudo;
- a unidade é uma destas: un, kg, g, pacote, pct, pc, cx, lt, l, ml, dz, fardo,
  rolo, pote, lata, fd — escolha a mais próxima do que o cupom mostra;
- quantidade e preço com vírgula decimal, sem "R$" e sem separador de milhar:
  1,052 e 25,49;
- o preço é o UNITÁRIO, não o total da linha. Se o cupom só traz o total,
  divida pelo quantidade;
- deixe de fora as linhas que não são produto: total, desconto, troco, forma de
  pagamento, CNPJ, dados da loja.

Se algum campo estiver ilegível na imagem, pule a linha inteira em vez de
adivinhar o número.

Responda só com as linhas.`;

/*
 * Fecha o ciclo: pedir a lista já no formato que o `fromMd` lê, pra baixar como
 * .md e importar. Só descreve o que o parser realmente aceita — o nome é
 * obrigatório e o resto é opcional, em qualquer ordem.
 */
export const LISTA_MD = `Monte uma lista de compras de supermercado no formato abaixo.

# feira

## Proteínas
- [ ] Filé de frango · 4 kg · mês · cozinha
- [ ] Ovo de galinha · 60 un · semana

## Frutas
- [ ] Banana · 3 kg · semana

Regras do formato:
- "## " abre uma categoria; use estas, nesta ordem: Proteínas, Laticínios,
  Grãos e massas, Pães, Frutas, Verduras e legumes, Despensa, Extras, Limpeza,
  Higiene, Outros;
- uma linha por item, começando por "- [ ] " e o nome do item;
- depois do nome, os campos separados por " · ", todos opcionais e em qualquer
  ordem: a quantidade do MÊS INTEIRO com a unidade ("4 kg"), a frequência de
  compra ("mês", "quinzena" ou "semana"), e "cozinha" quando o peso informado é
  o do alimento já pronto;
- não escreva preço;
- nome genérico de supermercado, em português do Brasil, cada item uma vez só.

Responda só com o documento, sem introdução e sem comentário no fim.`;
