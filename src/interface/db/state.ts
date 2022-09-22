export interface State<T> {
  set(value: T): void;
  read(): T;
}

export interface AsyncState<T> {
  set(value: T): Promise<void>;
  read(): Promise<T|void>;
}
