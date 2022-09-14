import type { Config } from "jest";

const config: Config = {
  extensionsToTreatAsEsm: [".ts"],
};

export default config;
import { dateRange } from "../util";
import { expect, test } from "@jest/globals";

test("dateRange", () => {
  expect(dateRange(new Date(1995, 11, 17), 2)).toStrictEqual([
    new Date(1995, 11, 17),

    new Date(1995, 11, 18),
  ]);
});
