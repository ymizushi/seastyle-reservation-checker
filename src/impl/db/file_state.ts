import { AsyncState } from "../../interface/db/state";
import * as fs from "node:fs/promises";

export class FileBasedState<T> implements AsyncState<T> {
  static filePath = "state.json";
  set(value: T): Promise<void> {
    const str = JSON.stringify(value);
    return fs.writeFile(FileBasedState.filePath, str, 'utf-8');
  }
  read(): Promise<T> {
    const buf = fs.readFile(FileBasedState.filePath, 'utf-8')
    const result= buf.then((buf) => JSON.parse(buf)) 
    return result.then(v => v as T)
  }
}