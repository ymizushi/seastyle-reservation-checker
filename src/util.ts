import fetch from "node-fetch";
var holiday_jp = require('@holiday-jp/holiday_jp');

export function dateRange(today: Date, addDays: number): Date[] {
  return [...new Array(addDays).keys()].map((num) => {
    const newDate = new Date(today);
    newDate.setDate(newDate.getDate() + num);
    return newDate;
  });
}

export function filterHolidays(dates: Date[]): Date[] {
  return dates.filter((date) => date.getDay() === 0 || date.getDay() === 6 || holiday_jp.isHoliday(date));
}

export async function notifySlack(content: Record<string, any>, url: string) {
  console.log(`notify to Slack:\n ${JSON.stringify(content)}`);
  return await postData(url, content);
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