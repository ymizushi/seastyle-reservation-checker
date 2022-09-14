import * as puppeteer from "puppeteer";
import { Page } from "puppeteer";
import * as sourceMapSupport from "source-map-support";
import { dateRange, filterHolidays, notifySlack, splitDateByMonth } from "./util.js";

const targetMarinas = [
  "[ 横浜 ] D-marina",
  "[ 三浦半島 ] リビエラシーボニアマリーナ",
  "[ 湘南 ] 湘南マリーナ",
  "[ 横須賀 ] サニーサイドマリーナ　ウラガ",
  "[ 横浜 ] 横浜ベイサイドマリーナ",
  "[ 逗葉 ] 小坪マリーナ",
  "[ 三浦半島 ] 油壺京急マリーナ",
  "[ 三浦半島 ] 湘南サニーサイドマリーナ"
]
const targetBoats = [
  "ベイフィッシャー",
  "SR-X",
  "AS-21",
  "F.A.S.T.23",
  "AX220",
  "YFR-27"
]

const targetMarinasString = `検索対象マリーナ:\n${targetMarinas.join("\n")}`
const targetBoatsString = `検索対象ボート:\n${targetBoats.join("\n")}`
const targetUrl = "https://sea-style-m.yamaha-motor.co.jp"

async function scrape() {
  const SLACK_WEBHOOK_URL= process.env.SLACK_WEBHOOK_URL
  if (!SLACK_WEBHOOK_URL) {
    console.log(`SLACK_WEBHOOK_URLが設定されていません`)
    process.exit(1) 
  }
  console.log(`SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}`)
  const holidays = filterHolidays(dateRange(new Date(), 30))
  await notifySlack(`${targetMarinasString}\n\n${targetBoatsString}\n\n`, SLACK_WEBHOOK_URL)

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 2000,
      height: 1200,
    }
  });
    
  const page = await browser.newPage();

  await page.goto(
    "https://sea-style-m.yamaha-motor.co.jp/Search/Day/boat"
  );

  if (holidays.length === 0) {
    await notifySlack(`休日・祝日が見つかりません`, SLACK_WEBHOOK_URL)
    process.exit(1) 
  }
  for(const holiday of holidays) {
    await scrapePerDay(holiday, page, SLACK_WEBHOOK_URL)
  }
  browser.close()
}

async function scrapePerDay(holiday: Date, page: Page, slackWebhookUrl: string) {
  const targetDayOfMonth = holiday.getDate().toString()
  const targetMonth = (holiday.getMonth()+1).toString()
  try {
    // "条件を追加して絞り込む" 押下
    await page.click('h2');
    await page.waitForTimeout(3000);

    // "レンタル日" の DatePickerをクリック
    await page.click("input[name=searchdate]");
    await page.waitForTimeout(2000);

    const displayedMonthRaw = await page.$$eval(".ui-datepicker-month", async (list: Element[]) => {
      return list[0].textContent
    })
    const displayedMonth = displayedMonthRaw?.replace('月', '')


    if (targetMonth === displayedMonth) {
      await selectDate(page, targetDayOfMonth, false)
    } else {
      await selectDate(page, targetDayOfMonth, true)
    }
    await page.waitForTimeout(3000);

    // エリア海域を関東に設定
    await page.select('select[name="reservationArea"]', 'B02')
    await page.waitForTimeout(3000);
  
    // クラブ艇を"ボート"に設定
    await page.select('select[name="boat"]', '1')
    await page.waitForTimeout(3000);
  
    // "条件を追加して再検索"を押下
    await page.click('input[type="button"]');
    await page.waitForTimeout(5000)

    const boats = await page.$$eval("section.contents", async (list: Element[]) => {
        return list.map(element => {
          const marinaPath = element.querySelector("p.marinaName > a")?.getAttribute('href') ?? null
          return {
            boatName: element.querySelector("h2.model")?.textContent ?? null,
            marinaName: element.querySelector("p.marinaName")?.textContent ?? null,
            marinaPath: marinaPath ?? null,
            period: element.querySelector("a > p.rsvDay")?.textContent ?? null
          }
        })
        .filter(e => e.boatName && e.marinaName && e.marinaPath)
    });
    const filteredBoats = boats
      .map(e => {
        return {
          ...e,
          marinaUrl: targetUrl + e.marinaPath
        }
      })
      .filter(e => e.marinaName && targetMarinas.includes(e.marinaName))
      .filter(e => e.boatName && targetBoats.filter(b=> e.boatName!.indexOf(b) !==-1).length > 0)
    if (filteredBoats.length > 1) {
      await notifySlack(boatsStringify(filteredBoats, targetMonth, targetDayOfMonth), slackWebhookUrl)
    } else {
      await notifySlack(`${targetMonth}/${targetDayOfMonth} で空きボートは見つかりませんでした`, slackWebhookUrl)
    }
  } catch (e) {
    console.log(`例外発生: ${e}`)
    await notifySlack(`${targetMonth}/${targetDayOfMonth} の空きボート検索に失敗しました`, slackWebhookUrl)
  }
}

function boatsStringify(boats: Boat[], targetMonth: string, targetDate: string): string {
  let line = ""
  line += `${targetMonth}/${targetDate}日は以下のマリーナでボートの空きがあります\n`
  boats.map(boat => {
    line += `---------------------------------------------------------------------\n`
    line += ((boat?.marinaName ? `マリーナ名: ${boat.marinaName}`: "") + "\n")
    line += ((boat?.boatName ? `ボート名: ${boat.boatName}`: "") + "\n")
    line += ((boat?.marinaUrl ? `URL: ${boat.marinaUrl}`: "") + "\n")
    line += ((boat?.period ? `時間帯: ${boat.period}`: "") + "\n")
  })
  line += "\n"
  return line
}

(function main() {
  sourceMapSupport.install()
  scrape();
})();

async function selectDate(
  page: puppeteer.Page,
  targetDate: string,
  isNextMonth: boolean
): Promise<void> {
  if (isNextMonth) {
    // 次へボタンをクリック
    await page.click('a.ui-datepicker-next.ui-corner-all > span')
    await page.waitForTimeout(5000)
  }

  const dateElements = await page.$x(`//a[text()='${targetDate}']`);
  if (dateElements.length > 0) {
    await (dateElements[0] as any).click();
    await page.waitForTimeout(5000)
  }
}

type Boat = {
  boatName: string|null,
  marinaName: string|null,
  marinaUrl: string|null,
  period: string|null
}
