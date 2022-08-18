import * as puppeteer from "puppeteer"

import * as sourceMapSupport from "source-map-support"

import fetch from 'node-fetch';


const SUCCEEDED = "SUCCEEDED"  as const
const FAILED = "FAILED" as const

export type Result = typeof SUCCEEDED | typeof FAILED

export type ActionResult = {
	result: Result,
	page: puppeteer.Page
}

async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) 
  });

}


// Cookie承諾
async function acceptCookie(page: puppeteer.Page): Promise<ActionResult> {
	await page.waitForTimeout(3000)
	await page.click('#onetrust-accept-btn-handler');
	await page.click('section[class="addcondition"]');
	return {
		result: SUCCEEDED,
		page
	}
}

async function selectDate(page: puppeteer.Page, targetDate: string): Promise<ActionResult> {
	await page.waitForTimeout(1000)
  const dateElements = await page.$x(`//b[text()='${targetDate}']`);
	if (dateElements.length > 0) {
		console.log(`SLACK_WEBHOOK_URL=${process.env.SLACK_WEBHOOK_URL}`);
		await postData(process.env.SLACK_WEBHOOK_URL,
		{
			text: "https://sea-style-m.yamaha-motor.co.jp/Marina/Info/reserve/marinacd/J14-0180 で船が予約できます"
		})
		await (dateElements[0] as any).click()
		return {
			result: SUCCEEDED,
			page
		}
	}
	return {
		result: FAILED,
		page
	}
}

async function scrape() {
	const browser = await puppeteer.launch({headless: false});
	const page = await browser.newPage();

	await page.goto('https://sea-style-m.yamaha-motor.co.jp/Marina/Info/reserve/marinacd/J14-0180');


	await page.waitForTimeout(1000)
	await selectDate(page, "22")
	await browser.close()
}

function main() {
	sourceMapSupport.install()
	scrape()
}

main()

//	// エリア入力
//	await page.waitfortimeout(1000)
//	await page.select('select[name="reservationarea"]', 'b02')
//
//	// 挺タイプ入力
//	await page.waitfortimeout(1000)
//	await page.select('select[name="boat"]', '1')
//
//
//	// 検索ボタン押下
//	await page.waitfortimeout(1000)
//	await page.click('input[type="button"]');
//
//	await page.waitfortimeout(1000)
//  await page.screenshot({path: 'example.png'});
