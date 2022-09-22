import { AsyncState } from "../../interface/db/state";
import * as fs from "node:fs/promises";

export class FileBasedState<T> implements AsyncState<T> {
  static filePath = "state.json";
  set(value: T): Promise<void> {
    return fs.writeFile(
      FileBasedState.filePath,
      JSON.stringify(value),
      "utf-8"
    );
  }
  read(): Promise<void | T> {
    return fs
      .readFile(FileBasedState.filePath, "utf-8")
      .then((buf) => JSON.parse(buf))
      .then((v) => v as T)
      .catch((e) => console.log(e));
  }
}
