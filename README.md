# seastyle-reservation-checker

[![Node.js CI](https://github.com/ymizushi/seastyle-reservation-checker/actions/workflows/node.js.yml/badge.svg)](https://github.com/ymizushi/seastyle-reservation-checker/actions/workflows/node.js.yml)

## build and run

```sh
$Env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T9WTHTN73/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX" # if windows power-shell
$Env:ENABLE_DIFF_MODE = "true" # if windows power-shell
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T9WTHTN73/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX # if unix/linux
export ENABLE_DIFF_MODE=true # if unix/linux

# You additionally set environment variable like below if you are runnning on ubuntu.
# sudo apt install chromium
npm install
npm run exec
```

## lint, format and test

```sh
npm run lint
npm run format
npm run test
```

# Setup on specific environement

## Raspbery Pie 4

```sh
sudo apt-get update
sudo apt-get install -y nodejs npm
sudo npm cache clean
sudo npm install npm n -g
sudo n stable
```

# crontab

```crontab
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games"
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX"
ENABLE_DIFF_MODE="true"
24 23 \* \* \* (cd ~/Develop/seastyle-reservation-checker && npm run exec)
```
