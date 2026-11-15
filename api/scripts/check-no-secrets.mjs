import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const values = {}
for (const name of ['.env.cloudflare', '.env.migration']) {
  Object.assign(values, parseEnv(await readFile(new URL(`../${name}`, import.meta.url), 'utf8')))
}
const names = ['CLOUDFLARE_API_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_PREVIOUS_SECRET']
const secrets = names.map((name) => values[name]).filter(Boolean)
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
for (const name of files) {
  const content = await readFile(new URL(name.replaceAll('\\', '/'), new URL('../../', import.meta.url)))
  if (secrets.some((value) => content.includes(value))) throw new Error(`Secret material found in versionable file: ${name}`)
}
console.log(`PASS: no deployment or production secret values found in ${files.length} versionable files.`)
