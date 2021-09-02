# Youtube Chat Logger

## Install

```bash
# Necessary for running Electron headless.
sudo apt install xvfb
npm i xvfb-maybe -g

npm install
```

## Potential errors

Some errors due to some `libnss3.so` were fixed using:

```bash
apt-get -y install --no-install-recommends xorg openbox libnss3 libasound2 libatk-adaptor libgtk-3-0
```

Also `Running as root without --no-sandbox is not supported.` error was got, so the `npm start` command was updated to include that option in the `electron` command. If it fails, it can be removed.

In some cases it's necessary to kill a process before starting:

```bash
pkill -9 Xvfb
# or
pkill -9 xvfb
```

Some other errors might be due to different Electron versions. It works with `13.0.1` (TODO: Set it in `package.json`). And in Digital Ocean it seems to take a longer time to boot, for some reason.

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
