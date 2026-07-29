import { registerSW } from 'virtual:pwa-register';
import { toast } from './lib/toaster.svelte';

/* registerType: 'prompt' — a versão nova só assume quando o usuário aceita,
   então ninguém fica preso num cache velho e nem perde o que estava fazendo. */
const update = registerSW({
  onNeedRefresh() {
    toast.show('Nova versão disponível', { label: 'atualizar', run: () => void update(true) });
  },
  onOfflineReady() {
    toast.show('Pronto pra usar sem internet');
  },
});
