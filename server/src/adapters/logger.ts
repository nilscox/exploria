export interface Logger {
  log(...args: unknown[]): void;
}

export class StubUiNotifier {
  notify() {}
}
