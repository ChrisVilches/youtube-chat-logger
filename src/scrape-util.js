import { cleanMessageContent } from './util.js'
import { load } from 'cheerio'

// TODO: Not sure what this does, but after testing without this, some emojis
//       didn't get scraped.
// TODO: I just saw a message where flags got removed. But other emojis work, so maybe I don't have flags??
function fixEmojis ($) {
  $('#message').find('img.emoji').each(function () {
    $(this).replaceWith($(this).attr('shared-tooltip-text'))
  })

  $('#message').find('tp-yt-paper-tooltip').each(function () {
    $(this).replaceWith('')
  })
}

export function parseMessageNode (html) {
  const $ = load(html)
  fixEmojis($)

  const id = $('[id]').first().attr('id')
  const text = cleanMessageContent($('#message').text())
  const icon = $('#img').attr('src')
  const author = $('#author-name').text()

  // Ignore the timestamp for now. TODO: Implement? (It makes almost no difference).
  // Deleted messages are removed from the DOM now, so that can't be scraped anymore.
  const timestamp = new Date()
  const deleted = false
  return { id, icon, author, deleted, text, timestamp }
}
