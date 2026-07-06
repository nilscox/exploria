import type { Shared } from '@exploria/server/shared';
import { infiniteQueryOptions, mutationOptions, queryOptions } from '@tanstack/react-query';

import { api } from './endpoints';

export const options = {
  auth: {
    me() {
      return queryOptions({
        queryKey: ['auth', 'me'],
        queryFn: () => api.auth.me(),
      });
    },

    login() {
      return mutationOptions({
        mutationFn: (token: string) => api.auth.login(token),
      });
    },

    logout() {
      return mutationOptions({
        mutationFn: () => api.auth.logout(),
      });
    },
  },

  sessions: {
    list() {
      return infiniteQueryOptions({
        queryKey: ['sessions', 'list'],
        async queryFn({ pageParam }) {
          return api.sessions.list({ page: pageParam, limit: 4 });
        },
        initialPageParam: 1,
        getNextPageParam({ nextPage }) {
          return nextPage;
        },
        select({ pages }) {
          return pages.flatMap((page) => page.items);
        },
      });
    },

    create(language: Shared.Language) {
      type Params = { model: string; demo?: boolean; message?: string };
      return mutationOptions({
        mutationFn: ({ model, demo }: Params) => api.sessions.create({ language, model, demo }),
      });
    },

    get(id: string) {
      return queryOptions({
        queryKey: ['sessions', 'get', { id }],
        queryFn: () => api.sessions.get(id),
      });
    },

    delete(id: string) {
      return mutationOptions({
        mutationFn: () => api.sessions.delete(id),
      });
    },

    setModel(id: string) {
      return mutationOptions({
        mutationFn: (model: string) => api.sessions.setModel(id, model),
      });
    },

    setPosture(id: string) {
      return mutationOptions({
        mutationFn: (posture: Shared.Posture | 'auto') => api.sessions.setPosture(id, posture),
      });
    },

    addTopic(id: string) {
      return mutationOptions({
        mutationFn: (label: string) => api.sessions.addTopic(id, label),
      });
    },

    updateTopic(id: string) {
      type Variables = {
        topicId: string;
        label?: string;
        status?: Shared.TopicStatus;
        summary?: string;
      };

      return mutationOptions({
        mutationFn: ({ topicId, ...changes }: Variables) => api.sessions.updateTopic(id, topicId, changes),
      });
    },

    addNote(id: string) {
      type Variables = {
        title: string;
        content: string;
        topicId: string | null;
      };

      return mutationOptions({
        mutationFn: ({ title, content, topicId }: Variables) => api.sessions.addNote(id, title, content, topicId),
      });
    },

    updateNote(id: string) {
      type Variables = {
        noteId: string;
        title?: string;
        content?: string;
      };

      return mutationOptions({
        mutationFn: ({ noteId, ...changes }: Variables) => api.sessions.updateNote(id, noteId, changes),
      });
    },

    postMessage(id: string) {
      return mutationOptions({
        mutationFn: (message: string) => api.sessions.postMessage(id, message),
      });
    },

    selectAnswer(id: string) {
      return mutationOptions({
        mutationFn: ({ questionId, optionId }: { questionId: string; optionId: string }) =>
          api.sessions.selectAnswer(id, questionId, optionId),
      });
    },

    generateSummary(id: string) {
      return mutationOptions({
        mutationFn: () => api.sessions.end(id),
      });
    },

    timer: {
      start(id: string) {
        return mutationOptions({
          mutationFn: (duration: number) => api.sessions.timer.start(id, duration),
        });
      },

      clear(id: string) {
        return mutationOptions({
          mutationFn: () => api.sessions.timer.clear(id),
        });
      },

      pause(id: string) {
        return mutationOptions({
          mutationFn: () => api.sessions.timer.pause(id),
        });
      },

      resume(id: string) {
        return mutationOptions({
          mutationFn: () => api.sessions.timer.resume(id),
        });
      },
    },
  },
};
