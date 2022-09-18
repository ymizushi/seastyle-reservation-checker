import { dateRange, filterHolidays } from "../util";
import { expect, test } from "@jest/globals";

test("dateRange", () => {
  expect(dateRange(new Date(1995, 11, 17), 2)).toStrictEqual([
    new Date(1995, 11, 17),

    new Date(1995, 11, 18),
  ]);
});

test("filterHolidays", () => {
  expect(
    filterHolidays([
      new Date(2022, 8, 16),
      new Date(2022, 8, 17),
      new Date(2022, 8, 18),
      new Date(2022, 8, 19),
      new Date(2022, 8, 20),
    ])
  ).toStrictEqual([
    new Date(2022, 8, 17),
    new Date(2022, 8, 18),
    new Date(2022, 8, 19),
  ]);
});
