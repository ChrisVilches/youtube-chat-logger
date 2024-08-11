import axios from 'axios'
import { sleep } from './util.js'
import { config } from './config.js'
import { withPage, browser } from './browser.js'
import { parseMessageNode } from './scrape-util.js'

const sleepMsBetweenScrapes = 3000
const scrapeTimes = 200

console.log('Starting scraper', new Date())
console.log(config)

const chatIds = config.CHAT_IDS
const indexApiKey = config.INDEX_API_KEY
const youtubeApi3Key = config.YOUTUBE_API_V3_KEY
const indexEndpoint = config.INDEX_ENDPOINT
const useVerboseLog = config.VERBOSE_LOG
const reloadPageEvery = config.RELOAD_PAGE_EVERY

const apiClient = axios.create({
  baseURL: indexEndpoint,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': indexApiKey
  }
})

function verboseLog (...args) {
  if (!useVerboseLog) return

  console.log(...args)
}

async function sendData (urlPath, payload) {
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

async function scrapeMetadata (chatId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${chatId}&key=${youtubeApi3Key}`

  const { data } = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  })

  // TODO: Just expecting this work lol... I think I should do some checking first.
  const title = data.items[0].snippet.title
  const imageUrl = data.items[0].snippet.thumbnails.default.url

  console.log([chatId, title, imageUrl])
  return await sendData('index_chat_title', { chatId, title, imageUrl })
}

const alreadySent = {}

async function scrapeMessages (chatId, page) {
  const all = await page.$$eval('yt-live-chat-text-message-renderer', elements =>
    elements.map(el => el.outerHTML)
  )

  alreadySent[chatId] ??= new Set()

  for (const payload of all.map(parseMessageNode)) {
    if (alreadySent[chatId].has(payload.id)) {
      continue
    }

    // Single element instead of batch, for simplicity.
    const result = await sendData('index_messages', { chatId, messages: [payload] })
    console.log(`[${chatId}] Indexed. ${payload.author}: ${payload.text.substring(0, 20)}...`)

    if (result) {
      alreadySent[chatId].add(payload.id)
    }
  }
}

async function scrape (chatId) {
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

      verboseLog(`[${chatId}] iteration ${iter}`)
      await scrapeMessages(chatId, page)
      await sleep(sleepMsBetweenScrapes)
    }
  })
}

async function main () {
  // Since sometimes the page may get broken, or stop working,
  // do a limited amount of times, then close the browser and process,
  // and have it restarted (via the process manager).
  await Promise.all(chatIds.map(scrape));

  (await browser).close()
  console.log('Closing process')
}

main().catch(console.error)
