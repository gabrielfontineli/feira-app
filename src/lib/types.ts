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
  /** Quantas linhas de nota já entraram nesta média. */
  n: number;
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
  /** Quantidade por mês pra uma casa de 2 pessoas (ver sugQty). */
  pp: number;
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
