/*
 * Verificação de ponta a ponta no Chrome de verdade, sem dependência nova:
 * fala CDP direto pelo WebSocket que o node já tem.
 *
 *   npm run build && npm run preview   # noutro terminal
 *   node tools/smoke.mjs
 *
 * Confere: app monta, exemplo carrega com o total certo, fontes próprias
 * carregam, service worker registra e a página abre offline.
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

const URL_APP = process.env.APP_URL || 'http://localhost:4173/';
const PORT = 9222;
const PROFILE = '/tmp/chrome-feira-smoke';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
}

rmSync(PROFILE, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run',
  '--disable-gpu',
  'about:blank',
]);

let ws;
let id = 0;
const pending = new Map();
const events = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msg = { id: ++id, method, params };
    pending.set(msg.id, { resolve, reject });
    ws.send(JSON.stringify(msg));
  });
}

/** Runtime.evaluate com await e retorno por valor. */
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + expression);
  return r.result.value;
}

try {
  // Espera o Chrome subir e pega o alvo.
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      target = list.find((t) => t.type === 'page');
    } catch {
      await sleep(250);
    }
  }
  if (!target) throw new Error('Chrome não respondeu na porta de debug');

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    } else if (m.method) {
      events.push(m);
    }
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  await send('Page.navigate', { url: URL_APP });
  for (let i = 0; i < 60 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await sleep(600);

  check('app monta', (await evaluate(`document.querySelector('.brand h1')?.textContent`)) === 'feira');

  const fontUsed = await evaluate(
    `(async()=>{await document.fonts.ready;return document.fonts.check('600 22px Fraunces')})()`,
  );
  check('fonte Fraunces própria carregou', fontUsed === true);

  // Onboarding -> exemplo pronto -> lista.
  await evaluate(
    `[...document.querySelectorAll('.choice button')].find(b=>b.textContent.includes('exemplo pronto')).click()`,
  );
  await sleep(300);
  const pessoas = await evaluate(`document.getElementById('qPessoas')?.value`);
  check('ajustes aparecem depois de escolher', pessoas === '2');

  await evaluate(
    `[...document.querySelectorAll('.btn')].find(b=>b.textContent.trim()==='Ir pra lista').click()`,
  );
  await sleep(400);

  const total = await evaluate(
    `[...document.querySelectorAll('.summary .s')].find(s=>s.textContent.includes('lista toda')).querySelector('.v').textContent.trim()`,
  );
  check('total do exemplo bate com o app antigo', total === 'R$ 2.407', total);

  const itemCount = await evaluate(`document.querySelectorAll('.item').length`);
  check('62 itens ligados na lista', itemCount === 62, String(itemCount));

  // Marca o primeiro item e confere o contador.
  await evaluate(`document.querySelector('.item .tick').click()`);
  await sleep(200);
  const done = await evaluate(
    `[...document.querySelectorAll('.summary .s')].find(s=>s.textContent.includes('comprado')).querySelector('.v').textContent.trim()`,
  );
  check('marcar item atualiza o contador', done === '1 / 62', done);

  // Digita o preço no item marcado: é o caminho principal pra aprender preço.
  const preco = await evaluate(`(() => {
    const el = document.querySelector('.item .paid input');
    if (!el) return 'sem campo';
    el.value = '9,90';
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  })()`);
  check('digitar o preço ao riscar o item', preco === '9,90', preco);

  // Adicionar pelo dicionário: um toque tem que produzir item completo.
  const novo = await evaluate(`(async () => {
    document.querySelector('.summary details.add').open = true;
    const el = document.querySelector('.summary details.add input');
    el.value = 'pepino';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 120));
    const linha = document.querySelector('.summary details.add li');
    if (!linha) return 'sem sugestao';
    const resumo = linha.querySelector('.txt span').textContent.trim();
    const hoje = [...linha.querySelectorAll('button')].find(b => b.textContent.trim() === 'hoje');
    if (!hoje) return 'sem botao hoje: ' + [...linha.querySelectorAll('button')].map(b=>b.textContent.trim()).join('|') + ' / ' + resumo;
    hoje.click();
    await new Promise(r => setTimeout(r, 200));
    return resumo;
  })()`);
  check('sugestão traz categoria, unidade e frequência', novo.startsWith('Verduras e legumes · '), novo);

  const avulso = await evaluate(
    `[...document.querySelectorAll('.item .lbl')].filter(e=>e.textContent.includes('Pepino')).length
     + '/' + document.querySelectorAll('.item .qty em.avulso').length`,
  );
  check('item entra na lista marcado como avulso da ida', avulso === '1/1', avulso);

  // As duas saídas de texto da lista. Em vez de pedir permissão de área de
  // transferência ao Chrome, intercepta o `writeText`: o que interessa aqui é o
  // texto que o app monta, e a cópia em si é o `copyText`, que tem teste.
  const clicaECopia = (rotulo) => `(async () => {
    let capturado = '';
    const real = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (t) => { capturado = t; };
    [...document.querySelectorAll('.btn')].find(b=>b.textContent.trim()==='${rotulo}').click();
    await new Promise(r => setTimeout(r, 250));
    navigator.clipboard.writeText = real;
    return capturado;
  })()`;

  const pelado = await evaluate(clicaECopia('Copiar o que falta'));
  const linhas = pelado.split('\n');
  check(
    'copiar o que falta: sem colchete, uma linha por item que sobrou',
    !pelado.includes('[') && linhas.length === 62 && linhas.every((l) => /\S \S/.test(l)),
    linhas.length + ' linhas, começa com "' + linhas[0] + '"',
  );

  const md = await evaluate(clicaECopia('Copiar como Markdown'));
  check(
    'copiar como markdown: categorias e a marcação do que já foi',
    md.includes('## Proteínas') && md.includes('- [x] ') && md.includes(' · '),
    md.split('\n').length + ' linhas',
  );

  const persisted = await evaluate(
    `Object.keys(localStorage).filter(k=>k.startsWith('feira:')).sort().join(',')`,
  );
  check(
    'salvou com o prefixo feira:',
    persisted.includes('feira:itens') && persisted.includes('feira:check:'),
    persisted,
  );

  // Service worker + offline.
  const swReady = await evaluate(
    `navigator.serviceWorker.ready.then(r=>!!r.active).catch(()=>false)`,
  );
  check('service worker ativo', swReady === true);

  const cached = await evaluate(
    `caches.keys().then(async ks=>{let n=0;for(const k of ks){n+=(await (await caches.open(k)).keys()).length}return n})`,
  );
  check('shell inteiro no cache (14 arquivos)', cached === 14, cached + ' entradas');

  const cachedFont = await evaluate(
    `caches.keys().then(async ks=>{for(const k of ks){for(const req of await (await caches.open(k)).keys()){if(req.url.includes('fraunces'))return true}}return false})`,
  );
  check('fonte no cache (tipografia offline)', cachedFont === true);

  await send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  events.length = 0;
  await send('Page.reload', {});
  for (let i = 0; i < 60 && !events.some((e) => e.method === 'Page.loadEventFired'); i++) await sleep(100);
  await sleep(800);

  const offlineOk = await evaluate(`document.querySelector('.brand h1')?.textContent`);
  check('abre offline', offlineOk === 'feira');
  // 63 = os 62 do exemplo mais o pepino avulso adicionado lá em cima. Era 62
  // enquanto o roteiro ia pro offline rápido demais e o pepino se perdia na
  // folga de 300 ms do salvamento automático — a expectativa antiga descrevia
  // uma escrita perdida, não o comportamento certo.
  const offlineItems = await evaluate(`document.querySelectorAll('.item').length`);
  check('dados sobrevivem ao offline', offlineItems === 63, String(offlineItems));
  const offlineFont = await evaluate(
    `(async()=>{await document.fonts.ready;return document.fonts.check('600 22px Fraunces')})()`,
  );
  check('tipografia certa offline', offlineFont === true);
} catch (err) {
  console.error('erro:', err.message);
  fails.push('exceção: ' + err.message);
} finally {
  try {
    ws?.close();
  } catch {}
  chrome.kill();
}

console.log(fails.length ? `\n${fails.length} falha(s)` : '\ntudo ok');
process.exit(fails.length ? 1 : 0);
