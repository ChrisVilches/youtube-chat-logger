const R = require('ramda');

const moment = require('moment-timezone');

const removeLineBreaks = str => str.replace(/(\r\n|\n|\r)/gm, '');

const removeDuplicateSpaces = str => str.replace(/\s+/g,' ').trim();

const currentDateFormatted = () => moment().format('YYYY/MM/DD HH:mm:ss');

// Log with date included.
const log = (...arguments) => {
  let date = currentDateFormatted();
  let arrArgs = [`(${date})`].concat(arguments);
  console.log.apply(null, arrArgs);
}

const chatIdsToFetch = () => {
  const rawString = process.env.CHAT_IDS || '';
  return rawString.split(',')
                  .map(R.trim)
                  .filter(s => s.length > 0);
}

const youtubeUrl = videoId => `https://www.youtube.com/live_chat?v=${videoId}`;

module.exports = {
  removeLineBreaks,
  removeDuplicateSpaces,
  log,
  youtubeUrl,
  chatIdsToFetch
};
