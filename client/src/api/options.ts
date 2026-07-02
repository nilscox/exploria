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

    postMessage(id: string) {
      return mutationOptions({
        mutationFn: (message: string) => api.sessions.postMessage(id, message),
      });
    },

    selectDiscussionPath(id: string) {
      return mutationOptions({
        mutationFn: (pathId: string) => api.sessions.selectDiscussionPath(id, pathId),
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
