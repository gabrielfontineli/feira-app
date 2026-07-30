/*
 * Layouts reais de nota fiscal, anonimizados: nenhum nome, CNPJ ou valor de
 * compra de verdade. Só entram aqui para os testes do parser.
 *
 * Cada fixture reproduz um jeito diferente de a nota chegar colada no app —
 * é a separação entre colunas que muda, e é justamente ela que o parser erra.
 */

/** NFC-e colada do site da Sefaz: colunas separadas por tabulação. */
export const NF_TAB = [
  'Item\tDescrição\tQtde\tUnid\tVl. Unid\tDesconto\tVl. Total',
  '001\tFILE PEITO FGO SADIA BD 1KG\t1,0\tUN\t25,49\t0,00\t25,49',
  '002\tARROZ BRANCO T1 PC 5KG\t2,0\tUN\t5,29\t0,00\t10,58',
  '003\tBANANA PRATA\t0,594\tKG\t5,99\t0,00\t3,55',
  '004\tBANANA PRATA\t1,236\tKG\t5,99\t0,00\t7,40',
  'Valor total\t1.052,80',
  'Forma pagamento\tCARTAO DE CREDITO',
  'Valor pago\t1.052,80',
].join('\n');

/** Cupom do app do mercado: colunas alinhadas com espaços. */
export const NF_ESPACOS = [
  'ITEM  DESCRICAO                 QTDE   UN    VL UNIT   DESC    VL TOTAL',
  '1     TOMATE ITALIANO           0,812  KG      8,99    0,00        7,30',
  '2     QUEIJO COALHO PC          0,450  KG     42,49    0,00       19,12',
  '3     LEITE INTEGRAL 1L         6,000  UN      4,79    0,00       28,74',
  '4     TOMATE ITALIANO           1,188  KG      8,99    0,00       10,68',
  'TOTAL GERAL                                                    1.052,80',
  'Valor descontado                                                   0,00',
].join('\n');

/*
 * O pior caso: PDF que colapsa tudo em espaço simples. Aqui a descrição contém
 * palavras que também são unidade ('PC', 'CX') e o preço vem com ponto decimal.
 * É a nota que produzia o "arroz de R$ 1,00" (defeito 1) e o "25,49 -> 2549"
 * (defeito 2).
 */
export const NF_ESPACO_SIMPLES = [
  '001 ARROZ BRANCO T1 PC 1KG 2,0 UN 5,29 0,00 10,58',
  '002 FILE PEITO FGO SADIA BD 1KG 1,0 UN 25.49 0,00 25.49',
  '003 OVO BRANCO GRANDE PC 30UN 1,0 CX 22,90 0,00 22,90',
  '004 BANANA PRATA KG 0,594 KG 5,99 0,00 3,55',
  'VALOR TOTAL R$ 62,62',
  'CNPJ 00.000.000/0001-00',
].join('\n');

export const FIXTURES = { NF_TAB, NF_ESPACOS, NF_ESPACO_SIMPLES };
