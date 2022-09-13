import * as puppeteer from "puppeteer";
import * as sourceMapSupport from "source-map-support";
import { dateRange, filterHolidays, notifySlack, splitDateByMonth } from "./util.js";
const SUCCEEDED = "SUCCEEDED";
const FAILED = "FAILED";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
async function selectDate(page, targetDate) {
    await page.waitForTimeout(1000);
    const dateElements = await page.$x(`//a[text()='${targetDate}']`);
    if (dateElements.length > 0) {
        await dateElements[0].click();
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
        headless: true,
        defaultViewport: {
            width: 2000,
            height: 1200,
        }
    });
    const page = await browser.newPage();
    await page.goto("https://sea-style-m.yamaha-motor.co.jp/Search/Day/boat");
    const targetYear = "2022";
    const targetMonth = "9";
    const holidayMap = splitDateByMonth(filterHolidays(dateRange(new Date(), 30)));
    const targetUrl = "https://sea-style-m.yamaha-motor.co.jp";
    const targetMarinas = [
        "[ 横浜 ] D-marina",
        "[ 三浦半島 ] リビエラシーボニアマリーナ",
        "[ 湘南 ] 湘南マリーナ",
        "[ 横須賀 ] サニーサイドマリーナ　ウラガ",
        "[ 横浜 ] 横浜ベイサイドマリーナ",
        "[ 逗葉 ] 小坪マリーナ",
        "[ 三浦半島 ] 油壺京急マリーナ",
        "[ 三浦半島 ] 湘南サニーサイドマリーナ"
    ];
    const targetBoats = [
        "ベイフィッシャー",
        "SR-X",
        "AS-21",
        "F.A.S.T.23",
        "AX220",
        "YFR-27"
    ];
    const targetMarinasString = `検索対象マリーナ:\n${targetMarinas.join("\n")}`;
    const targetBoatsString = `検索対象ボート:\n${targetBoats.join("\n")}`;
    SLACK_WEBHOOK_URL && await notifySlack(`${targetMarinasString}\n\n${targetBoatsString}\n\n`, SLACK_WEBHOOK_URL);
    for (const holiday of holidayMap.get(targetMonth)) {
        const targetDate = holiday.getDate().toString();
        await page.click('h2');
        await page.waitForTimeout(3000);
        await page.click("input[name=searchdate]");
        await page.waitForTimeout(2000);
        await selectDate(page, targetDate);
        await page.waitForTimeout(3000);
        await page.select('select[name="reservationArea"]', 'B02');
        await page.waitForTimeout(3000);
        await page.select('select[name="boat"]', '1');
        await page.waitForTimeout(3000);
        await page.click('input[type="button"]');
        await page.waitForTimeout(5000);
        const boats = await page.$$eval("section.contents", async (list) => {
            return list.map(element => {
                const marinaPath = element.querySelector("p.marinaName > a")?.getAttribute('href') ?? null;
                return {
                    boatName: element.querySelector("h2.model")?.textContent ?? null,
                    marinaName: element.querySelector("p.marinaName")?.textContent ?? null,
                    marinaPath: marinaPath ?? null,
                };
            })
                .filter(e => e.boatName && e.marinaName && e.marinaPath);
        });
        console.log(`boats:\n ${JSON.stringify(boats)}`);
        const filteredBoats = boats
            .map(e => {
            return {
                ...e,
                marinaUrl: targetUrl + e.marinaPath
            };
        })
            .filter(e => e.marinaName && targetMarinas.includes(e.marinaName))
            .filter(e => e.boatName && targetBoats.filter(b => e.boatName.indexOf(b) !== -1).length > 0);
        console.log(`filteredBoats:\n ${JSON.stringify(filteredBoats)}`);
        if (filteredBoats.length > 1 && SLACK_WEBHOOK_URL) {
            await notifySlack(boatsStringify(filteredBoats, targetYear, targetMonth, targetDate), SLACK_WEBHOOK_URL);
        }
    }
    browser.close();
}
function boatsStringify(boats, targetYear, targetMonth, targetDate) {
    let line = "";
    line += `${targetYear}/${targetMonth}/${targetDate}日は以下のマリーナでボートの空きがあります\n`;
    boats.map(boat => {
        line += `---------------------------------------------------------------------\n`;
        line += ((boat?.marinaName ? `マリーナ名: ${boat.marinaName}` : "") + "\n");
        line += ((boat?.boatName ? `ボート名: ${boat.boatName}` : "") + "\n");
        line += ((boat?.marinaUrl ? `URL: ${boat.marinaUrl}` : "") + "\n");
    });
    line += "\n";
    return line;
}
(function main() {
    sourceMapSupport.install();
    console.log(`SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}`);
    scrape();
})();
//# sourceMappingURL=core.js.map