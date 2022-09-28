export {};

declare global {
  interface Date {
    month(): number;
    dayOfMonth(): number;
    monthAndDayOfMonth(): string;
    dayOfWeekByJapanese(): string;
  }
}

Date.prototype.monthAndDayOfMonth = function () {
  return `${this.month()}/${this.dayOfMonth()}`;
};

Date.prototype.month = function () {
  return this.getMonth() + 1;
};

Date.prototype.dayOfMonth = function () {
  return this.getDate();
};

type DayOfWeek = "日" | "月" | "火" | "水" | "木" | "金" | "土";

function isDayOfWeek(dayOfWeek: string): dayOfWeek is DayOfWeek {
  return ["日", "月", "火", "水", "木", "金", "土"].includes(dayOfWeek);
}

function toJapanese(dayOfWeek: number): string {
  switch (dayOfWeek) {
    case 0:
      return "日";
    case 1:
      return "月";
    case 2:
      return "火";
    case 3:
      return "水";
    case 4:
      return "木";
    case 5:
      return "金";
    case 6:
      return "土";
    default:
      throw new Error(dayOfWeek.toString());
  }
}

Date.prototype.dayOfWeekByJapanese = function (): string {
  return toJapanese(this.getDay());
};
