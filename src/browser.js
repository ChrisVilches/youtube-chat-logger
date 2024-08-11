import puppeteer from 'puppeteer'
import { config } from './config.js'

// const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'

const args = config.BROWSER_ARGS
const headless = !config.OPEN_BROWSER

function openBrowser () {
  console.log('Opening browser...')
  return puppeteer.launch({
    headless,
    args
  })
}

export const browser = openBrowser()

export async function withPage (url, cb) {
  const page = await (await browser).newPage()
  // await page.setUserAgent(userAgent)

  const abortTypes = new Set(['image', 'media', 'font'])

  page.setRequestInterception(true)
  page.on('request', async req => {
    if (abortTypes.has(req.resourceType())) {
      req.abort()
    } else {
      req.continue()
    }
  })
  await page.goto(url)
  await page.waitForNetworkIdle()
  await cb(page)
  await page.close()
}
