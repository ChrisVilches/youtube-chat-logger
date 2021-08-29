# Youtube Chat Logger

## Install

```bash
# Necessary for running Electron headless.
sudo apt install xvfb
npm i xvfb-maybe -g

npm install
```

## Execution

Create `.env` file with the following content:

```bash
INDEX_API_KEY=xxxxxxxxyyyyyyyyzzzzzzzz
INDEX_ENDPOINT=http://deploy-url/api
CHAT_IDS=EHkMjfMw7oU,HpdO5Kq3o7Y,pjwy2a096YE,-5KAN9_CzSA,PchC9iKADuo
```

The process intentionally ends after certain conditions (e.g. unrecoverable errors), and starts running again afterwards.

The messages are most likely still on screen, so they will be attempted to be indexed again.

```
# Local
npm start

# For Heroku
npm run start-heroku
```

## Limitations

Two processes cannot be executed simultaneously, because of some Electron error.
