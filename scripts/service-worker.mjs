import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'

async function list(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const paths = await Promise.all(entries.map(entry => entry.isDirectory()
    ? list(dir + '/' + entry.name, prefix + entry.name + '/')
    : [prefix + entry.name]))
  return paths.flat()
}
const files = (await list('dist')).filter(path => path !== 'sw.js' && !path.endsWith('.txt')).sort()
const hash = createHash('sha256')
const worker = await readFile('scripts/worker.js', 'utf8')
hash.update(worker)
for (const path of files) hash.update(path).update(await readFile('dist/' + path))
await writeFile('dist/sw.js', 'const VERSION = ' + JSON.stringify(hash.digest('hex').slice(0, 16))
  + '\nconst SHELL = ' + JSON.stringify(files) + '\n' + worker)
