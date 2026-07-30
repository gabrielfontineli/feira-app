export type Freq = 'mes' | 'quinzena' | 'semana';

export interface Item {
  id: string;
  name: string;
  cat: string;
  freq: Freq;
  qty: number;
  unit: string;
  price: number;
  cook: boolean;
  /** Perda ao cozinhar em %, só deste item. Vazio: usa a `loss` do cfg. */
  loss?: number;
  on: boolean;
  nota: string;
  /**
   * Avulso de uma ida só, no formato 'AAAA-MM'. A lista mostra o item enquanto
   * o mês bater; no mês seguinte ele some sozinho, sem varredura nem limpeza.
   * Vazio: item fixo, aparece todo mês.
   */
  soHoje?: string;
}

export interface Cfg {
  pessoas: number;
  dias: number;
  loss: number;
  vale: number;
  limpeza: number;
  higiene: number;
  extras: number;
  started: number;
}

export interface PriceEntry {
  price: number;
  unit: string;
  /** Quantas notas já entraram nesta média. Base antiga contava linhas. */
  n: number;
  /** Data (AAAA-MM-DD) da última nota que mexeu no preço. Base antiga não tem. */
  lastSeen?: string;
}

export type PriceBase = Record<string, PriceEntry>;

/**
 * Preço digitado direto na lista, num mês. Guarda o estado anterior da base
 * porque é o que permite corrigir sem estragar a média — ver `registrarPago`.
 */
export interface Pago {
  /** Nome sob o qual o preço entrou na base. */
  name: string;
  /** Preço unitário digitado. */
  obs: number;
  unit: string;
  /** Entrada da base antes desta observação. Null: o nome ainda não existia. */
  prev: PriceEntry | null;
  /**
   * Preço que o item da lista mostrava antes da primeira digitação. A base é a
   * fonte do preço, mas item criado à mão pode ter preço sem nunca ter entrado
   * na base — sem isto, apagar o campo zerava esse preço. Quem preenche é a
   * camada de estado; `registrarPago` só carrega o valor adiante.
   */
  prevPrice?: number;
}

/** Preços digitados num mês, chaveados igual às marcações (slug do nome). */
export type Pagos = Record<string, Pago>;

/** Marcações de um mês: id do item -> comprado. */
export type Checks = Record<string, boolean>;

export interface DicEntry {
  /** Pedaços de descrição de nota fiscal que apontam pra este item. */
  k: string[];
  n: string;
  c: string;
  f: Freq;
  u: string;
  cook: 0 | 1;
  /**
   * Quantidade por mês pra uma casa de **2 pessoas** — é o `2` do nome, e é o
   * que `sugQty` divide. Antes chamava `pp`, o que sugeria por pessoa.
   */
  pp2: number;
  /** Perda ao cozinhar em %, quando o rendimento não é o padrão do cfg. */
  loss?: number;
  grp?: 'limpeza' | 'higiene';
  extra?: 1;
}

export interface NFRow {
  desc: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface Backup {
  app: string;
  v: number;
  exportado: string;
  cfg: Partial<Cfg>;
  itens: Item[];
  base: PriceBase;
  /** 'check:YYYY-MM' -> marcações daquele mês. */
  checks: Record<string, Checks>;
  /** 'pago:YYYY-MM' -> preços digitados na lista. Backup antigo não tem. */
  pagos?: Record<string, Pagos>;
}
