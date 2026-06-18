import { type Duration, add } from 'date-fns';

export interface Clock {
  now(): Date;
}

export class NativeDateClock implements Clock {
  now() {
    return new Date();
  }
}

export class StubClock implements Clock {
  date = new Date(0);

  now() {
    return this.date;
  }

  advance(duration: Duration) {
    this.date = add(this.date, duration);
  }
}
