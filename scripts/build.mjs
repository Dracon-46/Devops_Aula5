/**
 * Build simples: gera a pasta `dist/` que a etapa de deploy publica.
 *
 * Junta os arquivos estaticos de `public/` com os modulos de `src/` em um
 * unico diretorio plano, que e exatamente o que vai para o GitHub Pages.
 */

import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'dist');

const ARQUIVOS_DE_ORIGEM = ['metrics.js', 'app.js'];

async function construir() {
  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });

  await cp(join(raiz, 'public'), destino, { recursive: true });

  for (const arquivo of ARQUIVOS_DE_ORIGEM) {
    await cp(join(raiz, 'src', arquivo), join(destino, arquivo));
  }

  const gerados = await readdir(destino);
  console.log(`Build concluido em dist/ (${gerados.length} arquivos):`);
  for (const arquivo of gerados.sort()) {
    console.log(`  - ${arquivo}`);
  }
}

construir().catch((erro) => {
  console.error('Falha no build:', erro);
  process.exitCode = 1;
});
