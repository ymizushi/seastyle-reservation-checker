import * as puppeteer from "puppeteer";
import { Page } from "puppeteer";
import * as sourceMapSupport from "source-map-support";
import { dateRange, filterHolidays, notifySlack } from "./util.js";

const targetMarinas = [
  "[ 横浜 ] D-marina",
  "[ 横浜 ] 横浜ベイサイドマリーナ",
  "[ 横須賀 ] サニーサイドマリーナ　ウラガ",
  "[ 三浦半島 ] リビエラシーボニアマリーナ",
  "[ 三浦半島 ] 油壺京急マリーナ",
  "[ 三浦半島 ] 湘南サニーサイドマリーナ",
  "[ 三浦半島 ] 三崎港「うらり」",
  "[ 湘南 ] 湘南マリーナ",
  "[ 湘南 ] コグレマリンサービス",
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

const targetMarinasString = `検索対象マリーナ:\n${targetMarinas.join("\n")}`;
const targetBoatsString = `検索対象ボート:\n${targetBoats.join("\n")}`;
const targetUrl = "https://sea-style-m.yamaha-motor.co.jp";

async function scrape() {
  const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
  if (!SLACK_WEBHOOK_URL) {
    console.log(`SLACK_WEBHOOK_URLが設定されていません`);
    process.exit(1);
  }
  console.log(`SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}`);
  const holidays = filterHolidays(dateRange(new Date(), 30));
  await notifySlack(
    { text: `${targetMarinasString}\n\n${targetBoatsString}` },
    SLACK_WEBHOOK_URL
  );

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 2000,
      height: 1200,
    },
  });

  const page = await browser.newPage();

  await page.goto("https://sea-style-m.yamaha-motor.co.jp/Search/Day/boat");

  if (holidays.length === 0) {
    await notifySlack(
      { text: `休日・祝日が見つかりません` },
      SLACK_WEBHOOK_URL
    );
    process.exit(1);
  }
  for (const holiday of holidays) {
    await scrapePerDay(holiday, page, SLACK_WEBHOOK_URL);
  }
  browser.close();
}

async function scrapePerDay(
  holiday: Date,
  page: Page,
  slackWebhookUrl: string
) {
  const targetDayOfMonth = holiday.getDate().toString();
  const targetMonth = (holiday.getMonth() + 1).toString();
  try {
    // "条件を追加して絞り込む" 押下
    await page.click("h2");
    await page.waitForTimeout(3000);

    // "レンタル日" の DatePickerをクリック
    await page.click("input[name=searchdate]");
    await page.waitForTimeout(2000);

    const displayedMonthRaw = await page.$$eval(
      ".ui-datepicker-month",
      async (list: Element[]) => {
        return list[0].textContent;
      }
    );
    const displayedMonth = displayedMonthRaw?.replace("月", "");

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

    const boats = await page.$$eval(
      "section.contents",
      async (list: Element[]) => {
        return list
          .map((element) => {
            return {
              boatName: element.querySelector("h2.model")?.textContent ?? null,
              marinaName:
                element.querySelector("p.marinaName")?.textContent ?? null,
              marinaPath:
                element
                  .querySelector("p.marinaName > a")
                  ?.getAttribute("href") ?? null,
              period:
                element.querySelector("a > p.rsvDay")?.textContent ?? null,
              imagePath:
                element
                  .querySelector("div.reservWrap > div > p > img")
                  ?.getAttribute("src") ?? null,
              altText:
                element.querySelector("p.marinaName")?.textContent ?? null,
            };
          })
          .filter((e) => e.boatName && e.marinaName && e.marinaPath);
      }
    );
    const filteredBoats = boats
      .filter((e) => e.marinaName && targetMarinas.includes(e.marinaName))
      .filter(
        (e) =>
          e.boatName &&
          targetBoats.filter((b) => e.boatName!.indexOf(b) !== -1).length > 0
      );
    if (filteredBoats.length > 1) {
      await notifySlack(
        boatsJsonify(filteredBoats, targetMonth, targetDayOfMonth),
        slackWebhookUrl
      );
    } else {
      await notifySlack(
        {
          text: `${targetMonth}/${targetDayOfMonth} で空きボートは見つかりませんでした`,
        },
        slackWebhookUrl
      );
    }
  } catch (e) {
    console.log(`例外発生: ${e}`);
    await notifySlack(
      {
        text: `${targetMonth}/${targetDayOfMonth} の空きボート検索に失敗しました`,
      },
      slackWebhookUrl
    );
  }
}

function boatsJsonify(
  boats: Boat[],
  targetMonth: string,
  targetDate: string
): Record<string, any> {
  let text = `${targetMonth}/${targetDate}`;
  const headBlock: Record<string, any> = {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${text}* で空きボートが見つかりました`,
      },
    }
  const blocks = boats
    .map((boat) =>
      createBlocks(
        text,
        boat?.marinaName ?? "",
        boat?.marinaPath ? `${targetUrl}${boat?.marinaPath}` : "",
        boat?.boatName ?? "",
        boat?.period ?? "",
        boat?.imagePath ? `${targetUrl}${boat?.imagePath}` : "",
        boat?.altText ?? ""
      )
    )
    .reduce((prev, current) => prev.concat(current), []);
  return {
    blocks: [headBlock].concat(blocks)
  };
}

(function main() {
  sourceMapSupport.install();
  scrape();
})();

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

function createBlocks(
  targetDate: string,
  marinaName: string,
  marinaUrl: string,
  boatName: string,
  zone: string,
  imageUrl: string,
  altText: string
): Array<Record<string, any>> {
  return [
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${targetDate} ${zone}*\n*<${marinaUrl}|${marinaName}>*\nボート名: *${boatName}*`,
      },
      accessory: {
        type: "image",
        image_url: `${imageUrl}`,
        alt_text: `${altText}`,
      },
    },
  ];
}
