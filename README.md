# seastyle-reservation-checker [![Node.js CI](https://github.com/ymizushi/seastyle-reservation-checker/actions/workflows/node.js.yml/badge.svg)](https://github.com/ymizushi/seastyle-reservation-checker/actions/workflows/node.js.yml)

YAMAHA シースタイルのボート予約状況をスクレイピングにより Slack に通知するバッチ.

開発者のローカル開発環境が Windows11 で、バッチは Raspberry Pi 4 上で動かしているため、Windows11 と Raspberry Pi OS on Arm64 でのみ動作確認をしています.

## build and run

```sh
# set environment variable

# if windows power-shell
$Env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX"
$Env:ENABLE_DIFF_MODE = "true"

# if linux bash/zsh
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX
export ENABLE_DIFF_MODE=true # if unix/linux

npm install
npm run exec
```

## lint, format and test

```sh
npm run lint
npm run format
npm run test
```

## Setup on Raspberry Pie 4

### execute below command

```sh
sudo apt-get update
sudo apt-get install -y nodejs npm
sudo npm cache clean
sudo npm install npm n -g
sudo n stable
```

### edit crontab like below

```crontab
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games"
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX
ENABLE_DIFF_MODE=true
24 23 * * * (cd ~/Develop/seastyle-reservation-checker && npm run exec)
```
