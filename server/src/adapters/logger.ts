export interface Logger {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export class StubUiNotifier {
  notify() {}
}
