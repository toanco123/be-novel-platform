import { createApp } from './bootstrap'
import { AppConfig } from './config/app-config.service'

async function main() {
  const app = await createApp()
  const config = app.get(AppConfig)
  await app.listen(config.get('PORT'), config.get('HOST'))
}

void main()
