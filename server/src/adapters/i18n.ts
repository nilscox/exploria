import { intervalToDuration } from 'date-fns';
import Mustache from 'mustache';
import fs from 'node:fs';

import { languages } from '../domain/i18n';
import { messages } from '../domain/i18n/messages';

import type { Language, Translate } from '../domain/i18n';
import type { Session, TopicStatus } from '../domain/session';
import type { Timer } from '../domain/timer';
import type { Clock } from './clock';

type Templates = {
  instructions: {};
  'session-info': { session: Session };
  'timer-info': { timer: Timer | null };
};

type Template = keyof Templates;

export interface I18n {
  translate(lang: Language): Translate;
  render<T extends Template>(lang: Language, template: T, values: Templates[T]): string;
}

export class MustacheI18n implements I18n {
  private readonly clock: Clock;

  private readonly templates: Record<Template, Record<Language, string>>;

  constructor(clock: Clock) {
    this.clock = clock;

    this.templates = {
      instructions: MustacheI18n.loadTemplates('instructions'),
      'session-info': MustacheI18n.loadTemplates('session-info'),
      'timer-info': MustacheI18n.loadTemplates('timer-info'),
    };
  }

  private static loadTemplates(name: Template) {
    return Object.fromEntries(
      languages.map((lang) => [lang, fs.readFileSync(`templates/${name}.${lang}.md`, 'utf-8')]),
    ) as Record<Language, string>;
  }

  translate(lang: Language): Translate {
    const catalog = messages[lang];

    return ((key, ...args) => {
      const entry = catalog[key];

      return typeof entry === 'function' ? entry(args[0] as never) : entry;
    }) as Translate;
  }

  date(language: Language, date: Date) {
    return [
      new Intl.DateTimeFormat(language, { dateStyle: 'full' }).format(date),
      new Intl.DateTimeFormat(language, { timeStyle: 'full' }).format(date),
    ].join(', ');
  }

  render<T extends Template>(lang: Language, template: T, values: Templates[T]): string {
    const content = this.templates[template][lang];

    const view = {
      instructions: () => {},
      'session-info': this.sessionInfoView,
      'timer-info': this.timerInfoView,
    }[template] as (lang: Language, values: Templates[T]) => object;

    return Mustache.render(content, view(lang, values));
  }

  private sessionInfoView = (lang: Language, { session }: Templates['session-info']) => {
    const t = this.translate(lang);

    const statusLabels: Record<TopicStatus, string> = {
      pending: t('session-info.status.pending'),
      in_progress: t('session-info.status.in_progress'),
      done: t('session-info.status.done'),
    };

    const inProgressCount = session.topics.filter((topic) => topic.status === 'in_progress').length;

    return {
      hasPlan: session.topics.length > 0,
      topics: session.topics.map(({ id, label, status }) => ({ id, label, status: statusLabels[status] })),
      noTopicInProgress: inProgressCount !== 1,
      planUpToDate: inProgressCount === 1,
      timerInfo: this.render(lang, 'timer-info', { timer: session.timer }),
      hasNotes: session.notes.length > 0,
      notes: session.notes,
      posture: session.posture,
      auto: session.postureMode === 'auto',
      date: this.date(lang, new Date()),
    };
  };

  private timerInfoView = (_lang: Language, { timer }: Templates['timer-info']) => {
    if (!timer) {
      return { timer: null };
    }

    const duration = intervalToDuration({
      start: timer.startedAt,
      end: timer.pausedAt ?? this.clock.now(),
    });

    const elapsed = (duration.minutes ?? 0) + (duration.hours ?? 0) * 60;
    const remaining = Math.max(0, timer.duration - elapsed);

    return {
      timer: {
        duration: timer.duration,
        elapsed,
        remaining,
        timeUp: remaining === 0,
        paused: !!timer.pausedAt,
      },
    };
  };
}
