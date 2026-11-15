import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { parseEnv } from 'node:util'

const values = parseEnv(await readFile(new URL('../.env.migration', import.meta.url), 'utf8'))
const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_PREVIOUS_SECRET', 'RAZORPAY_ACCOUNT_ID']
const missing = names.filter((name) => name !== 'RAZORPAY_WEBHOOK_PREVIOUS_SECRET' && !values[name])
if (missing.length) throw new Error(`Missing settings: ${missing.join(', ')}`)
await mkdir(new URL('../.wrangler/', import.meta.url), { recursive: true })
await writeFile(new URL('../.wrangler/migration-secrets.json', import.meta.url), JSON.stringify(Object.fromEntries(names.filter((name) => values[name]).map((name) => [name, values[name]]))))
console.log('Prepared deployment secrets in an ignored local file. Live-payment enablement is excluded.')
