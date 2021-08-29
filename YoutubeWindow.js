const { BrowserWindow, ipcMain } = require('electron');

class YoutubeWindow {
  #handler;

  constructor(){
    this.#handler = () => {};
  }

  createWindow() {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        webviewTag: true,
        nodeIntegration: true,
        contextIsolation: false,
        preload: __dirname + '/webviewGenerator.js'
      }
    });
    win.loadFile('webviewContainer.html');
  }

  setIncomingMessagesHandler(handler){
    this.#handler = handler;
  }

  openWindow(){
    this.createWindow();

    ipcMain.on('chat-messages', async (event, chatId, messages) => {
      event.returnValue = true;
      this.#handler(chatId, messages);
    });
  }
}

module.exports = YoutubeWindow;
