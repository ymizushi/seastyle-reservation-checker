export type Boat = {
  boatName: string | null;
  marinaName: string | null;
  marinaPath: string | null;
  period: string | null;
  imagePath: string | null;
  altText: string | null;
};

export type BoatsMap = { [key: string]: Boat[] };

export function isSameBoatMap(a: BoatsMap, b: BoatsMap): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
