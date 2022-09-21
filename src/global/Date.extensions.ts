export {};

declare global {
  interface Date {
    month(): number;
    dayOfMonth(): number;
    monthAndDayOfMonth(): string;
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
