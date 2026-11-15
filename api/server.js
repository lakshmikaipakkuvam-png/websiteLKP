import 'dotenv/config'
import { createApp } from './app.js'

const port = process.env.PORT ?? 4000
const app = createApp()
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`)
})
