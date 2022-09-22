import { isSameBoatMap } from "../../scraper/boat";

const aIsSameToBe = {
  "9/25": [
    {
      boatName: "AX220",
      marinaName: "葉山マリーナ",
      marinaPath: "/Marina/Info/detail/marinacd/J14-0100",
      period: "・１日A10:00-16:00",
      imagePath: "/share/boat/tei_063.jpg",
      altText: "AX220",
    },
  ],
};

const bIsSameToA = {
  "9/25": [
    {
      boatName: "AX220",
      marinaName: "葉山マリーナ",
      marinaPath: "/Marina/Info/detail/marinacd/J14-0100",
      period: "・１日A10:00-16:00",
      imagePath: "/share/boat/tei_063.jpg",
      altText: "AX220",
    },
  ],
};

const cIsNotSameToAAndB = {
  "9/25": [
    {
      boatName: "AX221",
      marinaName: "葉山マリーナ",
      marinaPath: "/Marina/Info/detail/marinacd/J14-0100",
      period: "・１日A10:00-16:00",
      imagePath: "/share/boat/tei_063.jpg",
      altText: "AX220",
    },
  ],
};

test("isSameBoatMap", () => {
  expect(isSameBoatMap(aIsSameToBe, bIsSameToA)).toBeTruthy();
  expect(isSameBoatMap(aIsSameToBe, cIsNotSameToAAndB)).toBeFalsy();
});
