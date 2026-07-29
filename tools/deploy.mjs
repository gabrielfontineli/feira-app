/*
 * Publica o dist/ na branch gh-pages. Rode `npm run deploy`.
 *
 * Usa uma worktree descartável em vez de trocar de branch, então o diretório de
 * trabalho não é mexido — dá pra rodar com mudanças não commitadas na main.
 * Sem GitHub Actions de propósito: o token do gh não tem escopo `workflow`.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync, existsSync } from 'node:fs';

const WT = '.gh-pages';
const git = (...a) => execFileSync('git', a, { stdio: 'inherit' });

if (!existsSync('dist/index.html')) {
  console.error('dist/ vazio — rode `npm run build` primeiro.');
  process.exit(1);
}

rmSync(WT, { recursive: true, force: true });
execFileSync('git', ['worktree', 'prune']);

// Se a branch já existe no remoto, parte dela pra manter o histórico de deploys.
const remote = execFileSync('git', ['ls-remote', '--heads', 'origin', 'gh-pages'], {
  encoding: 'utf8',
});
if (remote.trim()) {
  git('fetch', '-q', 'origin', 'gh-pages');
  git('worktree', 'add', '-q', WT, '-B', 'gh-pages', 'origin/gh-pages');
  // Some tudo antes de copiar: assets antigos com hash no nome ficariam pra trás.
  execFileSync('git', ['-C', WT, 'rm', '-rq', '--ignore-unmatch', '.']);
} else {
  git('worktree', 'add', '--orphan', '-b', 'gh-pages', WT);
}

cpSync('dist', WT, { recursive: true });
writeFileSync(`${WT}/.nojekyll`, ''); // sem isso o Jekyll come pastas com _
git('-C', WT, 'add', '-A');

const changed = execFileSync('git', ['-C', WT, 'status', '--porcelain'], { encoding: 'utf8' });
if (changed.trim()) {
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  git('-C', WT, 'commit', '-qm', `deploy: build de ${sha}`);
  git('-C', WT, 'push', '-q', 'origin', 'gh-pages');
  console.log('publicado: https://gabrielfontineli.github.io/feira-app/');
} else {
  console.log('nada mudou desde o último deploy.');
}

git('worktree', 'remove', WT, '--force');
