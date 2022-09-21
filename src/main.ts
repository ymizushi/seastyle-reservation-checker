import * as puppeteer from "puppeteer";
import { Page } from "puppeteer";
import * as sourceMapSupport from "source-map-support";
import { dateRange, filterHolidays } from "./util.js";
import { createBlock, notifySlack } from "./slack/util.js";
import { Block } from "./slack/util.js";

const seastyleFqdn = "https://sea-style-m.yamaha-motor.co.jp";
const seastyleSearchPage = `${seastyleFqdn}/Search/Day/boat`;
const targetMarinas = [
  "[ 横浜 ] D-marina",
  "[ 横浜 ] 横浜ベイサイドマリーナ",
  "[ 横須賀 ] サニーサイドマリーナ　ウラガ",
  "[ 三浦半島 ] リビエラシーボニアマリーナ",
  "[ 三浦半島 ] 油壺京急マリーナ",
  "[ 三浦半島 ] 湘南サニーサイドマリーナ",
  "[ 三浦半島 ] 三崎港「うらり」",
  "[ 湘南 ] 湘南マリーナ",
  "[ 湘南 ] 片倉ボートマリーナ",
  "[ 逗葉 ] 葉山港",
  "[ 逗葉 ] 葉山マリーナ",
  "[ 逗葉 ] 小坪マリーナ",
];
const targetBoats = [
  "ベイフィッシャー",
  "SR-X",
  "AS-21",
  "F.A.S.T.23",
  "AX220",
];

const targetMarinasString = `検索対象マリーナ: ${targetMarinas
  .map((s) => `*${s}*`)
  .join(", ")}\n`;
const targetBoatsString = `検索対象ボート: ${targetBoats
  .map((s) => `*${s}*`)
  .join(", ")}\n`;

async function scrape() {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  if (!SLACK_WEBHOOK_URL) {
    console.log(`SLACK_WEBHOOK_URLが設定されていません`);
    process.exit(1);
  }
  console.log(`SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}`);
  const holidays = filterHolidays(dateRange(new Date(), 31));
  if (holidays.length === 0) {
    await notifySlack(
      { text: `休日・祝日が見つかりません` },
      SLACK_WEBHOOK_URL
    );
    process.exit(1);
  }

  const targetDatesString = `検索対象日付: ${holidays
    .map((day) => `*${day.getMonth() + 1}/${day.getDate()}*`)
    .join(", ")}\n`;
  const targetMarinaBlock = createBlock(targetMarinasString);
  const targetBoatsBlock = createBlock(targetBoatsString);
  const targetHolidays = createBlock(targetDatesString);

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 2000,
      height: 1200,
    },
  });

  const page = await browser.newPage();
  await page.goto(seastyleSearchPage);

  let targetBlocks = [targetMarinaBlock, targetBoatsBlock, targetHolidays];
  for (const holiday of holidays) {
    const blocks = await scrapePerDay(holiday, page);
    targetBlocks = targetBlocks.concat(blocks);
  }

  targetBlocks = targetBlocks.concat(
    createBlock("スクレイピングが終了しました")
  );
  notifySlack(
    {
      text: "スクレイピング結果",
      blocks: targetBlocks,
    },
    SLACK_WEBHOOK_URL
  );
  browser.close();
}

async function scrapePerDay(holiday: Date, page: Page): Promise<Block[]> {
  const targetDayOfMonth = holiday.getDate().toString();
  const targetMonth = (holiday.getMonth() + 1).toString();
  try {
    await manipulateSearchPage(page, targetMonth, targetDayOfMonth);
    const boats = await evalBoats(page);
    const filteredBoats = boats.filter(
      (boat) =>
        boat.marinaName &&
        targetMarinas.includes(boat.marinaName) &&
        boat.boatName &&
        // ボート名に対象ボートの文字列が含まれる
        targetBoats.filter((b) => boat.boatName!.indexOf(b) !== -1).length > 0
    );
    if (filteredBoats.length > 0) {
      return createBoatsBlocks(filteredBoats, targetMonth, targetDayOfMonth);
    }
    return [];
  } catch (e) {
    console.log(`例外発生: ${e}`);
    return [
      createBlock(
        `${targetMonth}/${targetDayOfMonth} の空きボート検索に失敗しました`
      ),
    ];
  }
}

function createBoatsBlocks(
  boats: Boat[],
  targetMonth: string,
  targetDayOfMonth: string
): Block[] {
  const targetDate = `${targetMonth}/${targetDayOfMonth}`;
  const headBlocks: Block[] = [
    createBlock(`*${targetDate}* で空きボートが見つかりました`),
  ];
  const boatBlocks: Block[] = boats
    .map((boat) =>
      createBoatBlocks(
        targetDate,
        boat?.marinaName ?? "",
        boat?.marinaPath ? `${seastyleFqdn}${boat?.marinaPath}` : "",
        boat?.boatName ?? "",
        boat?.period ?? "",
        boat?.imagePath ? `${seastyleFqdn}${boat?.imagePath}` : "",
        boat?.altText ?? ""
      )
    )
    .reduce((prev, current) => prev.concat(current), []);
  const result = headBlocks.concat(boatBlocks);
  console.log(`create boatBlocks: ${JSON.stringify(result)}\n`);
  return result;
}

async function selectDate(
  page: puppeteer.Page,
  targetDate: string,
  isNextMonth: boolean
): Promise<void> {
  if (isNextMonth) {
    // 次へボタンをクリック
    await page.click("a.ui-datepicker-next.ui-corner-all > span");
    await page.waitForTimeout(5000);
  }

  const dateElements = await page.$x(`//a[text()='${targetDate}']`);
  if (dateElements.length > 0) {
    await (dateElements[0] as any).click();
    await page.waitForTimeout(5000);
  }
}

type Boat = {
  boatName: string | null;
  marinaName: string | null;
  marinaPath: string | null;
  period: string | null;
  imagePath: string | null;
  altText: string | null;
};

function createBoatBlocks(
  targetDate: string,
  marinaName: string,
  marinaUrl: string,
  boatName: string,
  period: string,
  imageUrl: string,
  altText: string
): Block[] {
  return [
    {
      type: "divider",
    },
    createBlock(
      `*${targetDate} ${period}*\n*<${marinaUrl}|${marinaName}>*\nボート名: *${boatName}*`,
      imageUrl,
      altText
    ),
  ];
}

async function evalBoats(page: Page): Promise<Boat[]> {
  return await page.$$eval("section.contents", async (list: Element[]) => {
    return list.map((element) => {
      return {
        boatName: element.querySelector("h2.model")?.textContent ?? null,
        marinaName: element.querySelector("p.marinaName")?.textContent ?? null,
        marinaPath:
          element.querySelector("p.marinaName > a")?.getAttribute("href") ??
          null,
        period: element.querySelector("a > p.rsvDay")?.textContent ?? null,
        imagePath:
          element
            .querySelector("div.reservWrap > div > p > img")
            ?.getAttribute("src") ?? null,
        altText: element.querySelector("h2.model")?.textContent ?? null,
      };
    });
  });
}

async function manipulateSearchPage(
  page: Page,
  targetMonth: string,
  targetDayOfMonth: string
): Promise<void> {
  // "条件を追加して絞り込む" 押下
  await page.click("h2");
  await page.waitForTimeout(3000);

  // "レンタル日" の DatePickerをクリック
  await page.click("input[name=searchdate]");
  await page.waitForTimeout(2000);

  // デートピッカーに表示されている月を取得
  const displayedMonthRaw = await page.$$eval(
    ".ui-datepicker-month",
    async (list: Element[]) => {
      return list[0].textContent;
    }
  );
  // 文字列から月を削除
  const displayedMonth = displayedMonthRaw?.replace("月", "");

  // 表示月と対象月が違う場合(翌月）は > で翌月をクリック
  if (targetMonth === displayedMonth) {
    await selectDate(page, targetDayOfMonth, false);
  } else {
    await selectDate(page, targetDayOfMonth, true);
  }
  await page.waitForTimeout(3000);

  // エリア海域を関東に設定
  await page.select('select[name="reservationArea"]', "B02");
  await page.waitForTimeout(3000);

  // クラブ艇を"ボート"に設定
  await page.select('select[name="boat"]', "1");
  await page.waitForTimeout(3000);

  // "条件を追加して再検索"を押下
  await page.click('input[type="button"]');
  await page.waitForTimeout(5000);
}

(function main() {
  sourceMapSupport.install();
  scrape();
})();
