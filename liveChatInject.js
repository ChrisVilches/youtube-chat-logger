const { ipcRenderer } = require('electron');

// Polling from the chat server happens automatically due to live_chat being run on a webview.
// (And this script is injected there).

// Get the "v" query param in the URL, e.g.: https://www.youtube.com/live_chat?v=xRvlP6IsnWg
function getChatId(){
  const params = (new URL(document.location)).searchParams;
  return params.get('v');
}

function sendMessages(){
  // Including at the top doesn't work.
  const $ = require('jquery');
  let htmls = [];

  $('yt-live-chat-text-message-renderer').each(function(){
    let $message = $(this);
    htmls.push($message.prop('outerHTML'));
  });

  ipcRenderer.sendSync('chat-messages', getChatId(), htmls);
}

window.onload = function(){
  setInterval(sendMessages, 10000);
}
