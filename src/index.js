import puppeteer from 'puppeteer'
import axios from 'axios'
import { load } from 'cheerio'
import { sleep, cleanTitle, cleanMessageContent } from './util.js'

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'

const sleepMsBetweenScrapes = 3000
const reloadPageEvery = 40
const scrapeTimes = 200

const chatIds = (process.env.CHAT_IDS ?? '').split(',').map(x => x.trim())
const indexApiKey = process.env.INDEX_API_KEY ?? ''
const indexEndpoint = process.env.INDEX_ENDPOINT ?? ''
const useVerboseLog = process.env.VERBOSE_LOG === '1'
const headless = process.env.OPEN_BROWSER !== '1'
const browserArgs = (process.env.BROWSER_ARGS ?? '').split(',').map(x => x.trim())

console.log('verbose log', useVerboseLog)
console.log('headless', headless)
console.log('chat IDs', chatIds)
console.log('browser args', browserArgs)

const useApi = indexApiKey.length > 0 && indexEndpoint.length > 0

const apiClient = axios.create({
  baseURL: indexEndpoint,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': indexApiKey
  }
})

if (useApi) {
  console.log('Sending data to', indexEndpoint)
  console.log('Using key', indexApiKey)
} else {
  console.warn("Using development mode. Scraped data won't be sent to the server.")
}

function verboseLog(...args) {
  if (!useVerboseLog) return

  console.log(...args)
}

async function sendData(urlPath, payload) {
  // For development.
  if (!useApi) {
    console.log(`${urlPath} ${JSON.stringify(payload)}`)
    return true
  }

  try {
    const res = await apiClient.put(urlPath, payload)

    verboseLog(res.data)

    if (res.data.error > 0) {
      throw new Error('Messages contain errors')
    }
  } catch (e) {
    console.error('Indexing failed')
    console.error(`URL: ${urlPath}`)
    console.error(`Payload: ${payload}`)
    console.error(e.message)
    return false
  }

  return true
}

async function scrapeMetadata(chatId) {
  const url = `https://www.youtube.com/watch?v=${chatId}`
  const response = await axios.get(url, {
    headers: {
      'User-Agent': userAgent
    }
  })
  const $ = load(response.data)
  const imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:url"]').attr('content')

  const title = cleanTitle($('title').text())

  console.log('Visited URL', url)
  console.log(`${chatId}: ${title} (image url: ${imageUrl})`)

  if ((title ?? '').trim().length === 0) {
    console.error(`Couldn't get title from ${chatId}`)
    return false
  }

  return sendData('index_chat_title', { chatId, title, imageUrl })
}

const alreadySent = {}

// TODO: Not sure what this does, but after testing without this, some emojis
//       didn't get scraped.
function fixEmojis($) {
  $('#message').find('img.emoji').each(function() {
    $(this).replaceWith($(this).attr('shared-tooltip-text'))
  })

  $('#message').find('tp-yt-paper-tooltip').each(function() {
    $(this).replaceWith('')
  })
}

function parseMessageNode(html) {
  const $ = load(html)
  fixEmojis($)

  const id = $('yt-live-chat-text-message-renderer').attr('id')

  const text = cleanMessageContent($('#message').text())
  const icon = $('#img').attr('src')
  const author = $('#author-name').text()

  // Ignore the timestamp for now. TODO: Implement? (It makes almost no difference).
  // Deleted messages are removed from the DOM now, so that can't be scraped anymore.
  const timestamp = new Date()
  const deleted = false
  return { id, icon, author, deleted, text, timestamp }
}

async function scrapeMessages(chatId, page) {
  const all = await page.$$eval('yt-live-chat-text-message-renderer', elements =>
    elements.map(el => el.outerHTML)
  )

  alreadySent[chatId] ??= new Set()

  for (const payload of all.map(parseMessageNode)) {
    if (alreadySent[chatId].has(payload.id)) {
      verboseLog('skipping', chatId, payload.id)
      continue
    }

    // Single element instead of batch, for simplicity.
    const result = await sendData('index_messages', { chatId, messages: [payload] })

    alreadySent[chatId].add(payload.id)

    return result
  }
}


function openBrowser() {
  console.log('Getting browser (executing only once!!!!)')
  return puppeteer.launch({
    // TODO: It only works with headless: false... should be true.
    headless,
    args: browserArgs
  })
}

const browser = openBrowser()

async function withPage(url, cb) {
  const page = await (await browser).newPage()
  await page.setUserAgent(userAgent)
  await page.goto(url)
  await page.waitForNetworkIdle()

  await cb(page)
  await page.close()
}

async function scrape(chatId) {
  if (!(await scrapeMetadata(chatId))) {
    console.error(`Chat metadata ${chatId} could not be scraped`)
    return
  }


  await withPage(`https://www.youtube.com/live_chat?v=${chatId}`, async page => {
    for (let iter = 0; iter < scrapeTimes; iter++) {
      if (iter > 0 && iter % reloadPageEvery === 0) {
        await page.reload()
        verboseLog('reloaded page', chatId)
      }

      if (!(await scrapeMessages(chatId, page))) {
        console.error(`A message in chat ${chatId} had errors. Stopping...`)
        break
      }
      await sleep(sleepMsBetweenScrapes)
    }
  })
}

async function main() {
  // Since sometimes the page may get broken, or stop working,
  // do a limited amount of times, then close the browser and process,
  // and have it restarted (via the process manager).
  await Promise.all(chatIds.map(scrape));

  (await browser).close()
  console.log('Closing scraper')
}

main().catch(console.error)
