const { youtubeUrl, chatIdsToFetch } = require('./util');

window.onload = function(){
  const $ = require('jquery');
  const $container = $('#webview-container');

  const chatIds = chatIdsToFetch();

  chatIds.forEach(chatId => {
    $container.append(`<webview preload="./liveChatInject.js" src="${youtubeUrl(chatId)}"></webview>`);
  });
}
