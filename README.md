# Feira

Monthly grocery list for a household, built from a nutritionist's diet plan and
the receipts of past shopping trips. Offline-first, no account, no server: data
never leaves the device.

Svelte 5 + TypeScript + Vite, installable as a PWA. UI is in Brazilian
Portuguese; prices in BRL.

## Running it

```bash
npm install
npm run dev                  # http://localhost:5173
npm run build && npm run preview   # the real artifact, service worker active
```

The service worker needs `http://localhost` or HTTPS — opening `dist/index.html`
over `file://` will render the app but never register the worker.

## Checks

```bash
npm run check          # svelte-check, must be clean
npm run check:parity   # the numbers still match the old feira-app.html
node tools/smoke.mjs   # end-to-end in real Chrome (needs `npm run preview` running)
```

`check:parity` guards the arithmetic that drives spending decisions — the
expected totals were computed from the old app's data by a separate script, so
it is a real comparison and not a tautology. `tools/smoke.mjs` drives headless
Chrome over the DevTools protocol (no Puppeteer): it loads the example dataset,
verifies the month total, marks items off, then goes offline and reloads to
confirm the shell, the data, and the self-hosted fonts all survive.

## Layout

```
index.html            shell
src/app.css           design tokens, shared primitives, @font-face, print rules
src/main.ts           mount
src/pwa.ts            service-worker registration + update prompt
src/App.svelte        step navigation, header, file input
src/lib/*.svelte      Steps, Toast
src/lib/steps/        Start, Receipt, Diet, Editor + ItemCard, List, Backup
src/lib/*.ts          pure logic — parser, dictionary, prices, quantity math, storage
src/lib/state.svelte.ts   $state stores + debounced persistence
src/fonts/            latin-subset woff2 (npm run fonts:sync re-copies from node_modules)
tools/                parity check, smoke test, maskable icon source
feira-app.html        the original single-file app, kept for side-by-side comparison
```

Component-specific CSS lives in each component's scoped `<style>`. Only rules
shared by several components sit in `app.css`.

## Data and backup

Everything is in `localStorage` under the `feira:` prefix: `cfg`, `itens`,
`base` (learned prices) and one `check:YYYY-MM` per month. Sync between devices
is export/import of a `.json` backup, which now carries **every** month of
check-marks rather than just the open one.

## Deploying

`npm run build` produces a static `dist/`. `base` is `./`, so it works from any
path — a subfolder, GitHub Pages, Netlify drop, anywhere. Nothing server-side.

## Known issues in the ported logic

The port kept the original arithmetic byte-for-byte, including its bugs, so the
rewrite could be reviewed against the old numbers. They are the next batch of
work, each with a failing test first:

- The receipt parser picks the *first* token matching the unit regex, so on
  space-separated receipts a description word (`PC`, `LT`) hijacks it and a
  wrong unit price gets learned.
- `toNum` strips every `.`, so a dot-decimal receipt turns `25.49` into `2549`.
- The running average never decays and ignores the unit, so an old price sticks
  for months and `kg` prices can merge with per-piece ones.
- Weekly and fortnightly items display their *monthly* quantity under a "toda
  semana" heading.
- One global cooking-loss percentage for every meat.
