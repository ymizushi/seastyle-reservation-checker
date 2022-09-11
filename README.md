# seastyle-reservation-checker
[![Node.js CI](https://github.com/ymizushi/seastyle-reservation-checker/actions/workflows/node.js.yml/badge.svg)](https://github.com/ymizushi/seastyle-reservation-checker/actions/workflows/node.js.yml)

## build

```sh
npm run build
```

## exec

```sh
$Env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T9WTHTN73/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX" # if windows power-shell
# export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T9WTHTN73/XXXXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX # if unix/linux
# 
# sudo apt install chromium
# export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install 
npm run exec
```

## test

```sh
npm run test
```


# Setup

## Raspbery Pie 
sudo apt-get update
sudo apt-get install -y nodejs npm
sudo npm cache clean
sudo npm install npm n -g
sudo n stable
