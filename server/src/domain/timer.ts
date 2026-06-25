import { intervalToDuration, sub } from 'date-fns';

import { assert } from '../utils';

export class Timer {
  readonly duration: number;
  readonly startedAt: Date;
  readonly pausedAt?: Date;

  constructor(duration: number, startedAt: Date, pausedAt?: Date) {
    this.duration = duration;
    this.startedAt = startedAt;
    this.pausedAt = pausedAt;
  }

  static start(duration: number, at: Date): Timer {
    return new Timer(duration, at);
  }

  pause(at: Date): Timer {
    return new Timer(this.duration, this.startedAt, at);
  }

  resume(at: Date): Timer {
    assert(this.pausedAt);

    const elapsed = intervalToDuration({ start: this.startedAt, end: this.pausedAt });

    return new Timer(this.duration, sub(at, elapsed));
  }

  get isPaused(): boolean {
    return this.pausedAt !== undefined;
  }
}
