const cheerio = require('cheerio');
const { removeLineBreaks, removeDuplicateSpaces } = require('./util');
const moment = require('moment-timezone');

function messageHtmlToObject(msgHtml){
  const $ = cheerio.load(msgHtml);

  const id = $('yt-live-chat-text-message-renderer').attr('id');

  // When deleted, the 'is-deleted' attribute is present with an empty string. Otherwise, the attribute is not present.
  const deleted = typeof $('yt-live-chat-text-message-renderer').attr('is-deleted') != 'undefined';
  const icon = $('#img').attr('src');
  const textTimestamp = $('#timestamp').html();
  const author = $('#author-name').text();

  // Remove garbage code from emojis.
  $('#message').find('img.emoji').each(function(){
    $(this).replaceWith($(this).attr('shared-tooltip-text'));
  });

  $('#message').find('tp-yt-paper-tooltip').each(function(){
    $(this).replaceWith('');
  });

  const text = removeDuplicateSpaces(removeLineBreaks($('#message').text()));

  const timestamp = calculateTimestamp(textTimestamp);

  return { id, icon, timestamp, textTimestamp, author, text, deleted };
}

// TODO: This procedure would be better as a pure function.
// textTimestamp is the timestamp that comes from chat, as a string such as '6:23 AM'
function calculateTimestamp(textTimestamp){
  const timestamp = moment(textTimestamp, ["h:mm A"]);

  // If the current machine time is different from the date parsed (by mixing current day + timestamp from chat)
  // this can only mean that the timestamp from chat is something like 23:59 PM and the current machine time
  // is the next day in the morning, which results from delay from the actual submission and the fetching.
  // Therefore, subtract one day, because the day should be the day before, instead.
  if(moment().format('A') != timestamp.format('A')){ // format A means PM or AM
    timestamp.subtract(1, 'days');
  }
  return timestamp;
}

module.exports = messageHtmlToObject;
