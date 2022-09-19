import fetch from "node-fetch";
var holiday_jp = require("@holiday-jp/holiday_jp");

export function dateRange(today: Date, addDays: number): Date[] {
  return [...new Array(addDays).keys()].map((num) => {
    const newDate = new Date(today);
    newDate.setDate(newDate.getDate() + num);
    return newDate;
  });
}

export function filterHolidays(dates: Date[]): Date[] {
  return dates.filter(
    (date) =>
      date.getDay() === 0 || date.getDay() === 6 || holiday_jp.isHoliday(date)
  );
}
