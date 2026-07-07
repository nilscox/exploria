import z from 'zod';

import { postures } from './session.ts';

import type { I18n } from '../adapters/i18n.ts';
import type { SearchClient } from '../adapters/search-client.ts';
import type { Language, Translate } from './i18n/index.ts';
import type { Session } from './session.ts';

export function createFacilitatorTools(i18n: I18n, searchClient: SearchClient | null) {
  return (language: Language) => facilitatorTools(searchClient, i18n.translate(language));
}

export function createCuratorTools(i18n: I18n) {
  return (language: Language) => curatorTools(i18n.translate(language));
}

export type FacilitatorTools = (language: Language) => ReturnType<typeof facilitatorTools>;
export type CuratorTools = (language: Language) => ReturnType<typeof curatorTools>;

export type Tool<Param extends z.ZodType = z.ZodType> = {
  description: string;
  param: Param;
  terminal?: boolean;
  execute: (session: Session, param: z.infer<Param>) => string | Promise<string>;
};

function tool<Param extends z.ZodType>(tool: Tool<Param>) {
  return tool;
}

const facilitatorTools = (searchClient: SearchClient | null, t: Translate) => ({
  askQuestions: tool({
    description: t('ask-questions.description'),
    terminal: true,
    param: z.object({
      questions: z
        .array(
          z.object({
            content: z.string().min(1).describe(t('ask-questions.content-param')),
            options: z
              .array(
                z.object({
                  label: z.string().min(1).max(64).describe(t('ask-questions.label-param')),
                  description: z.string().max(128).optional().describe(t('ask-questions.description-param')),
                }),
              )
              .min(2)
              .max(5),
          }),
        )
        .min(1)
        .max(1),
    }),
    execute: (session, { questions }) => {
      session.askQuestions(questions);

      return t('tool.result.ok');
    },
  }),

  setPosture: tool({
    description: t('set-posture.description'),
    terminal: true,
    param: z.object({
      posture: z.enum(postures).describe(t('set-posture.posture-param')),
      reason: z.string().min(1).describe(t('set-posture.reason-param')),
    }),
    execute: (session, { posture, reason }) => {
      session.setPosture(posture, reason, false);

      return t('tool.result.ok');
    },
  }),

  webSearch: searchClient
    ? tool({
        description: t('web-search.description'),
        param: z.object({ query: z.string().min(1).describe(t('web-search.query-param')) }),
        execute: async (session, { query }) => {
          const results = await searchClient.search(query);

          session.recordSearch(query, results.length);

          if (results.length === 0) {
            return t('web-search.no-results', { query });
          }

          return results.map((r) => `**${r.title}**\n${r.url}\n${r.snippet}`).join('\n\n');
        },
      })
    : undefined,
});

const curatorTools = (t: Translate) => ({
  setSubject: tool({
    description: t('set-subject.description'),
    param: z.object({
      subject: z.string().min(1),
    }),
    execute: (session, { subject }) => {
      session.setSubject(subject);
      return t('tool.result.ok');
    },
  }),

  addTopics: tool({
    description: t('add-topics.description'),
    param: z.object({
      labels: z.array(z.string().min(1).max(64)).min(1),
      parentId: z.string().nullish().describe(t('add-topics.parent-param')),
    }),
    execute: (session, { labels, parentId }) => {
      session.addTopics(labels, parentId ?? null);

      return t('tool.result.ok');
    },
  }),

  updateTopic: tool({
    description: t('update-topic.description'),
    param: z.object({
      id: z.string(),
      label: z.string().min(1).max(64).optional(),
      status: z.enum(['pending', 'in_progress', 'done']).optional(),
      summary: z.string().optional().describe(t('update-topic.summary-param')),
    }),
    execute: (session, { id, label, status, summary }) => {
      session.updateTopic(id, {
        label,
        status,
        summary,
      });

      return t('tool.result.ok');
    },
  }),

  removeTopic: tool({
    description: t('remove-topic.description'),
    param: z.object({
      id: z.string(),
    }),
    execute: (session, { id }) => {
      session.removeTopic(id);

      return t('tool.result.ok');
    },
  }),

  moveTopic: tool({
    description: t('move-topic.description'),
    param: z.object({
      id: z.string(),
      parentId: z.string().nullable().describe(t('move-topic.parent-param')),
    }),
    execute: (session, { id, parentId }) => {
      session.moveTopic(id, parentId);

      return t('tool.result.ok');
    },
  }),

  saveNote: tool({
    description: t('save-note.description'),
    param: z.object({
      title: z.string().min(1).max(64).describe(t('save-note.title-param')),
      content: z.string().min(1).describe(t('save-note.content-param')),
      topicId: z.string().nullish().describe(t('save-note.topic-param')),
    }),
    execute: (session, { title, content, topicId }) => {
      session.addNote({
        title,
        content,
        parentId: topicId ?? null,
      });

      return t('tool.result.ok');
    },
  }),

  moveNote: tool({
    description: t('move-note.description'),
    param: z.object({
      noteId: z.string(),
      topicId: z.string().nullable().describe(t('move-note.topic-param')),
    }),
    execute: (session, { noteId, topicId }) => {
      session.moveNote(noteId, topicId);

      return t('tool.result.ok');
    },
  }),
});
