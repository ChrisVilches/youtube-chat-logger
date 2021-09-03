require('dotenv').config();
const moment = require('moment-timezone');
const axios = require('axios');
const { Subject } = require('rxjs');
const { concatMap } = require('rxjs/operators');
const messageHtmlToObject = require('./messageHtmlToObject');
const YoutubeWindow = require('./YoutubeWindow');
const { app } = require('electron');
const { log, chatIdsToFetch } = require('./util');
const cheerio = require('cheerio');
const R = require('ramda');
const setTZ = require('set-tz');

const TIMEZONE = 'Asia/Tokyo';
setTZ(TIMEZONE);
moment.tz.setDefault(TIMEZONE);

const messageBatchesStream = new Subject();

const REQUIRED_ENV_VARIABLES = Object.freeze(['INDEX_API_KEY', 'INDEX_ENDPOINT', 'CHAT_IDS']);

REQUIRED_ENV_VARIABLES.forEach(varName => {
  const value = process.env[varName];
  if(R.is(String, value) && value.trim().length > 0) return;
  throw new Error(`Must define ${varName} as environment variable.`);
});

axios.defaults.baseURL = process.env.INDEX_ENDPOINT;
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['X-API-KEY'] = process.env.INDEX_API_KEY;

// TODO: Eventually add 'retry' functionality here in the pipe logic instead of having to
// reset the process after an error with 'forever' or a Bash while true.
messageBatchesStream.pipe(
  concatMap(async payload => {
    log(`Sending ${payload.messages.length} messages to be indexed (Chat ${payload.chatId}). Payload is: ${JSON.stringify(payload).length} chars.`);
    return await axios.put('index_messages', payload);
  })
).subscribe({
  next: response => {
    log(`✔ Response after indexing:`, response.data);
    if(response.data.skipped > 0){
      console.warn('Some results were skipped. This could be because more than one scraper is running.');
      console.warn('When only one process is running, messages are not scraped more than once.');
      console.warn('Note: For the few first indexations, skipped results are expected (cache warm-up).');
    }
  },
  error: error => {
    let msg = error && error.response ? error.response.data : error;
    log(`👎 Error while indexing:`, msg);
    log('Exiting process. Open the process again to retry indexing messages.');
    process.exit();
  }
});

const indexed = new Set();
const deleted = new Set();
const fetchedChatTitles = new Set();

const cacheMessageStatus = msg => {
  indexed.add(msg.id);
  if(msg.deleted)
    deleted.add(msg.id);
}

const messageNeedsIndexation = msg => {
  const alreadyIndexed = indexed.has(msg.id);
  const alreadyDeleted = deleted.has(msg.id);

  // After the message has been marked as deleted, there's nothing else to do.
  if(alreadyDeleted) return false;

  // If the message was indexed once, then it needs to be indexed again only if it was marked as deleted.
  if(alreadyIndexed){
    return msg.deleted;
  }

  // In any other case, it needs to be indexed.
  return true;
}

const scrapeChatTitle = async chatId => {
  // For now just do it once, without error handling other than logging.
  // Don't quit the process because sometimes chats end without notice.
  // In that case, simply don't scrape it.
  try {
    if(fetchedChatTitles.has(chatId)) return;
    fetchedChatTitles.add(chatId);

    let response = await axios.get(`https://www.youtube.com/watch?v=${chatId}`);
    const $ = cheerio.load(response.data);
    let title = $('title').text();

    if(typeof title != 'string') return;
    if(title.length == 0) return;

    title = title.replace(/ - YouTube$/, '').trim();

    const scrapeResponse = await axios.put('index_chat_title', {
      chatId,
      title
    });

    log('Finished scraping chat title.', chatId, scrapeResponse.data);
  } catch(e){
    log(`Error happened while scraping title for ID=${chatId}.`);
    log(e);
  }
}

app.whenReady().then(() => {
  const chatIds = chatIdsToFetch();

  if(chatIds.length == 0){
    console.warn('No chats were defined. Add chats and restart the process.');
    return;
  }

  console.log('Chat IDs are the following.');
  chatIds.forEach((chatId, i) => {
    console.log(`(${i+1}) ${chatId}`);
  });

  const youtubeWindow = new YoutubeWindow();
  youtubeWindow.openWindow();
  youtubeWindow.setIncomingMessagesHandler(async (chatId, messages) => {
    messages = R.map(messageHtmlToObject, messages)
                .filter(messageNeedsIndexation)
                .map(R.tap(cacheMessageStatus));

    // Scrape only once (cache results).
    // Scrape the chat data before messages.
    await scrapeChatTitle(chatId);

    // To avoid timeout errors due to large batches, make the batches smaller.
    const chunks = R.splitEvery(10, messages);
    for(let i=0; i<chunks.length; i++){
      messageBatchesStream.next({ chatId, messages: chunks[i] });
    }
  });
});
