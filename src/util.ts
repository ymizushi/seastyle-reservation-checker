import fetch from "node-fetch";
import * as holiday_jp from '@holiday-jp/holiday_jp';

export function dateRange(today: Date, addDays: number): Date[] {
  return [...new Array(addDays).keys()]
    .map(num => {
      const newDate = new Date(today)
      newDate.setDate(newDate.getDate()+num+1)
      return newDate
    })
}

export function splitDateByMonth(days: Date[]): Map<string, Date[]> {
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

export function filterHolidays(dates: Date[]): Date[] {
  // const holidays = holiday_jp.between(new Date('2010-09-14'), new Date('2010-09-21'));
  // console.log(holidays[0]['name']); // 敬老の日
  return dates.filter(date => date.getDay() === 0 || date.getDay() === 6)
}

export async function notifySlack(content: string, url: string) {
  console.log(`notify to Slack:\n ${content}`)
  return await postData(url, {
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
