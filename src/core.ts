import * as puppeteer from "puppeteer";

import * as sourceMapSupport from "source-map-support";

import fetch from "node-fetch";
// import * as holiday_jp from "@holiday-jp/holiday_jp"

// const holidays = holiday_jp.between(new Date('2010-09-14'), new Date('2010-09-21'));
// console.log(holidays[0]['name']); // 敬老の日
// 
// const targetYear = 2022
// const targetMonth = 10 //9月

function dateRange(today: Date, addDays: number): Date[] {
  return [...new Array(addDays).keys()]
    .map(num => {
      const newDate = new Date(today)
      newDate.setDate(newDate.getDate()+num+1)
      return newDate
    })
}

function splitDateByMonth(days: Date[]): Map<string, Date[]> {
  const dict = new Map<string, Date[]>() 
  days.forEach((d: Date) => {
    const key = (d.getMonth()+1).toString()
    const value = dict.get(key)
    if (value !== undefined) {
      dict.set(key, value.concat([d]))
    } else {
      dict.set(key, [])
    }
  })
  return dict
}

function filterHolidays(dates: Date[]): Date[] {
  return dates.filter(date => date.getDay() === 0 || date.getDay() === 6)
}


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

type Boat = {
  boatName: string|null,
  marinaName: string|null,
  marinaUrl: string|null,
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

  const targetYear = "2022"
  const targetMonth = "9" 
  const holidayMap = splitDateByMonth(filterHolidays(dateRange(new Date(), 30)))

  const targetMarinas = [
    "[ 横浜 ] D-marina",
    "[ 三浦半島 ] リビエラシーボニアマリーナ",
    "[ 湘南 ] 湘南マリーナ",
    "[ 横須賀 ] サニーサイドマリーナ　ウラガ",
    "[ 横浜 ] 横浜ベイサイドマリーナ",
    "[ 逗葉 ] 小坪マリーナ",
  ]
  const targetUrl = "https://sea-style-m.yamaha-motor.co.jp"
  const targetBoats = [
    "ベイフィッシャー",
    "SR-X",
    "AS-21",
    "F.A.S.T.23",
    "AX220",
    "YFR-27"
  ]

  for(const holiday of holidayMap.get(targetMonth)!) {
    const targetDate = holiday.getDate().toString()

    // "条件を追加して絞り込む" 押下
    await page.click('h2');
    await page.waitForTimeout(3000);

    // "レンタル日" の DatePickerをクリック
    await page.click("input[name=searchdate]");
    await page.waitForTimeout(2000);

    // DatePickerで日付を入力
    await selectDate(page, targetDate)
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

    const evaluate: (list: Element[]) => Promise<Boat[]> = (async (list: Element[]) => {
        // https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#code-transpilation-issues の理由からeval外のスコープの変数を参照できないのでここで定義


        return list.map(element => {
          const marinaPath = element.querySelector("p.marinaName > a")?.getAttribute('href') ?? null
          return {
            boatName: element.querySelector("h2.model")?.textContent ?? null,
            marinaName: element.querySelector("p.marinaName")?.textContent ?? null,
            marinaUrl: marinaPath ? targetUrl + marinaPath: null,
          }
        })
        .filter(e => e.boatName && e.marinaName && e.marinaUrl)
        .filter(e => e.marinaName && targetMarinas.includes(e.marinaName))
        .filter(e => e.boatName && targetBoats.filter(b=> e.boatName!.indexOf(b) !==-1).length > 0)
    })

    const boats: any = await page.$$eval("section.contents", `${evaluate}`);
    await notifySlack(boatsStringify(boats, targetYear, targetMonth, targetDate))
  }
}


function boatsStringify(boats: Boat[], targetYear: string, targetMonth: string, targetDate: string): string {
  let line = ""
  line += `${targetYear}/${targetMonth}/${targetDate}日は以下のマリーナでボートの空きがあります\n`
  boats.map(boat => {
    line += `---------------------------------------------------------------------\n`
    line += ((boat?.marinaName ? `マリーナ名: ${boat.marinaName}`: "") + "\n")
    line += ((boat?.boatName ? `ボート名: ${boat.boatName}`: "") + "\n")
    line += ((boat?.marinaUrl ? `URL: ${boat.marinaUrl}`: "") + "\n")
  })
  line += "\n"
  return line
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