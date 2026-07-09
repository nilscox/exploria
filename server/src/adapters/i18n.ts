import { intervalToDuration } from 'date-fns';
import Mustache from 'mustache';
import fs from 'node:fs';

import { languages } from '../domain/i18n/index.ts';
import { messages } from '../domain/i18n/messages.ts';

import type { Dependencies } from '../di.ts';
import type { Language, Translate } from '../domain/i18n/index.ts';
import type { Topic } from '../domain/mindmap.ts';
import type { Session, TopicStatus } from '../domain/session.ts';
import type { Timer } from '../domain/timer.ts';
import type { Clock } from './clock.ts';

type Templates = {
  instructions: {};
  curator: { session: Session };
  'session-info': { session: Session };
  'timer-info': { timer: Timer | null };
  summary: {};
  demo: { first: boolean; subject?: string };
};

type Template = keyof Templates;

export interface I18n {
  translate(lang: Language): Translate;
  render<T extends Template>(lang: Language, template: T, values: Templates[T]): string;
}

export class MustacheI18n implements I18n {
  private readonly clock: Clock;

  private readonly templates: Record<Template, Record<Language, string>>;

  constructor({ clock }: Dependencies<'clock'>) {
    this.clock = clock;

    this.templates = {
      instructions: MustacheI18n.loadTemplates('instructions'),
      curator: MustacheI18n.loadTemplates('curator'),
      'session-info': MustacheI18n.loadTemplates('session-info'),
      'timer-info': MustacheI18n.loadTemplates('timer-info'),
      summary: MustacheI18n.loadTemplates('summary'),
      demo: MustacheI18n.loadTemplates('demo'),
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
      curator: this.curatorView,
      'session-info': this.sessionInfoView,
      'timer-info': this.timerInfoView,
      summary: () => {},
      demo: this.demoView,
    }[template] as (lang: Language, values: Templates[T]) => object;

    return Mustache.render(content, view(lang, values));
  }

  private sessionInfoView = (lang: Language, { session }: Templates['session-info']) => {
    return {
      mindmap: this.mindmap(lang, session),
      timerInfo: this.render(lang, 'timer-info', { timer: session.timer }),
      posture: session.posture,
      auto: session.postureMode === 'auto',
      intensity: session.intensity,
      messageLength: session.messageLength,
      date: this.date(lang, new Date()),
    };
  };

  private demoView = (_lang: Language, { first, subject }: Templates['demo']) => {
    return { first, subject };
  };

  private curatorView = (lang: Language, { session }: Templates['curator']) => {
    const inProgressCount = session.topics.filter((topic) => topic.status === 'in_progress').length;

    return {
      mindmap: this.mindmap(lang, session),
      noTopicInProgress: inProgressCount !== 1,
      mapUpToDate: inProgressCount === 1,
    };
  };

  private mindmap(lang: Language, session: Session): string {
    const t = this.translate(lang);

    const statusLabels: Record<TopicStatus, string> = {
      pending: t('session-info.status.pending'),
      in_progress: t('session-info.status.in_progress'),
      done: t('session-info.status.done'),
    };

    return MustacheI18n.renderMindmap(session, statusLabels);
  }

  private static renderMindmap(session: Session, statusLabels: Record<TopicStatus, string>): string {
    const { mindmap } = session;
    const lines: string[] = [`- ${session.subject || '(no subject yet)'}`];

    const renderNotes = (parentId: string | null, indent: string) => {
      for (const note of mindmap.notesOf(parentId)) {
        lines.push(`${indent}- note: ${note.title}: ${note.content} (id: "${note.id}")`);
      }
    };

    const renderTopic = (topic: Topic, depth: number) => {
      const indent = '  '.repeat(depth);
      const status = topic.status ? `, ${statusLabels[topic.status]}` : '';

      lines.push(`${indent}- ${topic.label} (id: "${topic.id}"${status})`);

      if (topic.summary) {
        lines.push(`${indent}  summary: ${topic.summary}`);
      }

      renderNotes(topic.id, `${indent}  `);

      for (const child of mindmap.children(topic.id)) {
        renderTopic(child, depth + 1);
      }
    };

    renderNotes(null, '  ');

    for (const topic of mindmap.children(null)) {
      renderTopic(topic, 1);
    }

    return lines.join('\n');
  }

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
