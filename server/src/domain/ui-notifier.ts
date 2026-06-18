export type UiEvent<Type extends string = string, Payload = {}> = { type: Type } & Payload;

export interface UiNotifier<Event extends UiEvent = UiEvent> {
  notify(key: string, event: Event): void;
}
