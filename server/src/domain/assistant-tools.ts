import z from 'zod';

import { postures } from './session.ts';

import type { I18n } from '../adapters/i18n.ts';
import type { SearchClient } from '../adapters/search-client.ts';
import type { Language, Translate } from './i18n/index.ts';
import type { Session } from './session.ts';

export function createTools(i18n: I18n, searchClient: SearchClient | null) {
  return (language: Language) => tools(i18n, searchClient, i18n.translate(language));
}

export type Tools = ReturnType<ReturnType<typeof createTools>>;
export type AssistantTools = (language: Language) => Tools;

export type Tool<Param extends z.ZodType = z.ZodType> = {
  description: string;
  param: Param;
  execute: (session: Session, param: z.infer<Param>) => string | Promise<string>;
};

function tool<Param extends z.ZodType>(tool: Tool<Param>) {
  return tool;
}

const tools = (i18n: I18n, searchClient: SearchClient | null, t: Translate) => ({
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

  addNodes: tool({
    description: t('add-nodes.description'),
    param: z.object({
      labels: z.array(z.string().min(1).max(64)).min(1),
      parentId: z.string().nullish().describe(t('add-nodes.parent-param')),
    }),
    execute: (session, { labels, parentId }) => {
      session.addNodes(labels, parentId ?? null);

      return t('tool.result.ok');
    },
  }),

  updateNode: tool({
    description: t('update-node.description'),
    param: z.object({
      id: z.string(),
      label: z.string().min(1).max(64).optional(),
      status: z.enum(['pending', 'in_progress', 'done']).optional(),
    }),
    execute: (session, { id, label, status }) => {
      session.updateNode(id, {
        label,
        status,
      });

      return t('tool.result.ok');
    },
  }),

  removeNode: tool({
    description: t('remove-node.description'),
    param: z.object({
      id: z.string(),
    }),
    execute: (session, { id }) => {
      session.removeNode(id);

      return t('tool.result.ok');
    },
  }),

  moveNode: tool({
    description: t('move-node.description'),
    param: z.object({
      id: z.string(),
      parentId: z.string().nullable().describe(t('move-node.parent-param')),
    }),
    execute: (session, { id, parentId }) => {
      session.moveNode(id, parentId);

      return t('tool.result.ok');
    },
  }),

  saveNote: tool({
    description: t('save-note.description'),
    param: z.object({
      note: z.string().min(1),
      nodeId: z.string().nullish().describe(t('save-note.node-param')),
    }),
    execute: (session, { note, nodeId }) => {
      session.addNote({
        content: note,
        parentId: nodeId ?? null,
      });

      return t('tool.result.ok');
    },
  }),

  moveNote: tool({
    description: t('move-note.description'),
    param: z.object({
      noteId: z.string(),
      nodeId: z.string().nullable().describe(t('move-note.node-param')),
    }),
    execute: (session, { noteId, nodeId }) => {
      session.moveNote(noteId, nodeId);

      return t('tool.result.ok');
    },
  }),

  getSavedNotes: tool({
    description: t('get-saved-notes.description'),
    param: z.object({}),
    execute: (session) => {
      if (session.notes.length === 0) {
        return t('get-saved-notes.empty');
      }

      const list = session.notes.map((note, i) => `${i + 1}. ${note.content}`).join('\n');

      return `${t('get-saved-notes.heading')}\n${list}`;
    },
  }),

  startTimer: tool({
    description: t('start-timer.description'),
    param: z.object({
      duration: z.number().min(1).describe(t('start-timer.duration-param')),
    }),
    execute: (session, { duration }) => {
      session.startTimer(duration);

      return t('tool.result.ok');
    },
  }),

  clearTimer: tool({
    description: t('clear-timer.description'),
    param: z.object({}),
    execute: (session) => {
      session.clearTimer();

      return t('tool.result.ok');
    },
  }),

  pauseTimer: tool({
    description: t('pause-timer.description'),
    param: z.object({}),
    execute: (session) => {
      session.pauseTimer();

      return t('tool.result.ok');
    },
  }),

  resumeTimer: tool({
    description: t('resume-timer.description'),
    param: z.object({}),
    execute: (session) => {
      session.resumeTimer();

      return t('tool.result.ok');
    },
  }),

  getRemainingTime: tool({
    description: t('get-remaining-time.description'),
    param: z.object({}),
    execute: (session) => {
      return i18n.render(session.language, 'timer-info', { timer: session.timer });
    },
  }),

  setDiscussionPaths: tool({
    description: t('set-discussion-paths.description'),
    param: z.object({
      paths: z
        .array(
          z.object({
            label: z.string().min(1).max(64).describe(t('set-discussion-paths.label-param')),
            description: z.string().max(128).optional().describe(t('set-discussion-paths.description-param')),
          }),
        )
        .min(2)
        .max(4),
    }),
    execute: (session, { paths }) => {
      session.setDiscussionPaths(paths);

      return t('tool.result.ok');
    },
  }),

  setPosture: tool({
    description: t('set-posture.description'),
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
