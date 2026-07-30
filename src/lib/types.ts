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
}
