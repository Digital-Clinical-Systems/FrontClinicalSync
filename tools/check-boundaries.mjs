/**
 * Verifica las reglas de dependencia entre Bounded Contexts declaradas en la
 * seccion 4.6.6 del informe. Se ejecuta con `npm run check:boundaries`.
 *
 * Reglas aplicadas:
 *  R1. Las capas domain/ y application/ de un contexto NO pueden importar nada
 *      de otro contexto. Lo unico que cruza es shared/ (eventos e identificadores)
 *      y iam/, declarado Shared Kernel.
 *  R2. La capa presentation/ puede componer datos de varios contextos, pero solo
 *      a traves de su capa application/ o de su domain/model. Nunca de su
 *      infrastructure/, que es detalle privado del contexto que la implementa.
 *  R3. Ningun contexto puede importar audit/: es sumidero y nadie depende de el.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join, dirname, normalize, sep } from 'node:path';

const CONTEXTS = ['iam', 'patients', 'vital-signs', 'alerts', 'handover', 'audit'];
const SHARED_KERNEL = ['shared', 'iam'];

const files = globSync('src/app/**/*.ts', { cwd: process.cwd() })
  .filter(f => !f.endsWith('.spec.ts'));

const violations = [];

for (const file of files) {
  const parts = file.split(sep);
  const own = parts[2];
  if (!CONTEXTS.includes(own)) continue;
  const layer = parts[3];

  const source = readFileSync(file, 'utf8');
  for (const imp of source.matchAll(/from '(\.[^']+)'/g)) {
    const target = normalize(join(dirname(file), imp[1])).split(sep);
    const other = target[2];
    if (!CONTEXTS.includes(other) || other === own) continue;
    if (SHARED_KERNEL.includes(other)) continue;

    const rel = file.replace(`src${sep}app${sep}`, '');
    if (layer === 'domain' || layer === 'application') {
      violations.push(`R1  ${rel}\n    importa ${other}/ desde la capa ${layer}/`);
    } else if (layer === 'presentation') {
      const otherLayer = target[3];
      if (otherLayer === 'infrastructure') {
        violations.push(`R2  ${rel}\n    importa la infraestructura privada de ${other}/`);
      }
    }
    if (other === 'audit') {
      violations.push(`R3  ${rel}\n    depende de audit/, que debe ser sumidero`);
    }
  }
}

if (violations.length) {
  console.error(`\nFronteras entre Bounded Contexts: ${violations.length} violacion(es)\n`);
  violations.forEach(v => console.error(v + '\n'));
  process.exit(1);
}
console.log(`Fronteras entre Bounded Contexts: OK (${files.length} archivos revisados)`);
