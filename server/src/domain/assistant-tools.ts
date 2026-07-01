import z from 'zod';

import { mindmapEdgeTypes } from './mindmap.ts';
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

  addTopics: tool({
    description: t('add-topics.description'),
    param: z.object({
      labels: z.array(z.string().min(1).max(64)).min(1),
    }),
    execute: (session, { labels }) => {
      session.addTopics(labels);

      return t('tool.result.ok');
    },
  }),

  updateTopic: tool({
    description: t('update-topic.description'),
    param: z.object({
      id: z.string(),
      label: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'done']).optional(),
    }),
    execute: (session, { id, label, status }) => {
      session.updateTopic(id, {
        label,
        status,
      });

      return t('tool.result.ok');
    },
  }),

  saveNote: tool({
    description: t('save-note.description'),
    param: z.object({
      note: z.string().min(1),
    }),
    execute: (session, { note }) => {
      session.addNote({
        content: note,
      });

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

  addMindmapNode: tool({
    description: t('add-mindmap-node.description'),
    param: z.object({
      label: z.string().min(1).max(64),
      parentId: z.string().optional(),
      edgeType: z.enum(mindmapEdgeTypes).optional(),
    }),
    execute: (session, { label, parentId, edgeType }) => {
      session.addMindmapNode({ label, parentId, edgeType });

      return t('tool.result.ok');
    },
  }),

  updateMindmapNode: tool({
    description: t('update-mindmap-node.description'),
    param: z.object({
      id: z.string(),
      label: z.string().min(1).max(64),
    }),
    execute: (session, { id, label }) => {
      session.updateMindmapNode(id, { label });

      return t('tool.result.ok');
    },
  }),

  removeMindmapNode: tool({
    description: t('remove-mindmap-node.description'),
    param: z.object({
      id: z.string(),
    }),
    execute: (session, { id }) => {
      session.removeMindmapNode(id);

      return t('tool.result.ok');
    },
  }),

  connectMindmapNodes: tool({
    description: t('connect-mindmap-nodes.description'),
    param: z.object({
      source: z.string(),
      target: z.string(),
      type: z.enum(mindmapEdgeTypes).describe(t('connect-mindmap-nodes.type-param')),
    }),
    execute: (session, { source, target, type }) => {
      session.connectMindmapNodes(source, target, type);

      return t('tool.result.ok');
    },
  }),

  disconnectMindmapNodes: tool({
    description: t('disconnect-mindmap-nodes.description'),
    param: z.object({
      source: z.string(),
      target: z.string(),
    }),
    execute: (session, { source, target }) => {
      session.disconnectMindmapNodes(source, target);

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
