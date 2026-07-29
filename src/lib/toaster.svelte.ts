export interface ToastAction {
  label: string;
  run: () => void;
}

class Toaster {
  msg = $state('');
  action = $state<ToastAction | null>(null);
  #tmr: ReturnType<typeof setTimeout> | undefined;

  /** Aviso rápido. Com ação, fica na tela até o usuário decidir. */
  show(msg: string, action: ToastAction | null = null) {
    this.msg = msg;
    this.action = action;
    clearTimeout(this.#tmr);
    if (!action) this.#tmr = setTimeout(() => this.hide(), 2200);
  }

  hide() {
    this.msg = '';
    this.action = null;
  }
}

export const toast = new Toaster();
