import * as puppeteer from "puppeteer";

import * as sourceMapSupport from "source-map-support";

import fetch from "node-fetch";

const SUCCEEDED = "SUCCEEDED" as const;
const FAILED = "FAILED" as const;

export type Result = typeof SUCCEEDED | typeof FAILED;

export type ActionResult = {
  result: Result;
  page: puppeteer.Page;
};

const SLACK_WEBHOOK_URL= process.env.SLACK_WEBHOOK_URL

// Cookie承諾
async function acceptCookie(page: puppeteer.Page): Promise<ActionResult> {
  await page.waitForTimeout(3000);
  await page.click("#onetrust-accept-btn-handler");
  await page.click('section[class="addcondition"]');
  return {
    result: SUCCEEDED,
    page,
  };
}

async function selectDate(
  page: puppeteer.Page,
  targetDate: string
): Promise<ActionResult> {
  await page.waitForTimeout(1000);
  const dateElements = await page.$x(`//a[text()='${targetDate}']`);
  if (dateElements.length > 0) {
    await (dateElements[0] as any).click();
    return {
      result: SUCCEEDED,
      page,
    };
  }
  return {
    result: FAILED,
    page,
  };
}

async function scrape() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 2000,
      height: 1200,
    }
  });
    
  const page = await browser.newPage();

  await page.goto(
    "https://sea-style-m.yamaha-motor.co.jp/Search/Day/boat"
  );

  const targetDate = '10'

  await page.waitForTimeout(1000);

  await page.click('h2');
  await page.waitForTimeout(1000);

  await page.click("input[name=searchdate]");
  await page.waitForTimeout(1000);

  await page.waitForTimeout(1000);
  await selectDate(page, targetDate)

  await page.waitForTimeout(1000);
  await page.select('select[name="reservationArea"]', 'B02')
  
  await page.waitForTimeout(1000);
  await page.select('select[name="boat"]', '1')
  
  // 検索ボタン押下
  await page.waitForTimeout(1000)
  await page.click('input[type="button"]');

  await page.waitForTimeout(1000)
  await page.focus('#sort_boat')

  await page.waitForTimeout(5000)
  const elements = await page.$$("div") 
  for (const element of elements) {
    console.log(await element.jsonValue())
  }
  const contents = await page.$$eval("p.marinaName", list => {
      const targetUrl = "https://sea-style-m.yamaha-motor.co.jp"
      return list.map(data => {
        return {
          marinaUrl: `${targetUrl}${data.children.item(0)?.getAttribute('href')}`,
          marinaName: data.textContent
        }
      })
  });
  notifySlack(contents.map(obj => `${targetDate}日は以下のマリーナでボートの空きがあります\n` + JSON.stringify(obj)).join("\n"))
}

async function notifySlack(content: string) {
    return await postData(SLACK_WEBHOOK_URL, {
      text: content,
    });
}

async function postData(url = "", data = {}) {
  return await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

function main() {
  sourceMapSupport.install();
  console.log(`SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}`);
  scrape();
}

main();