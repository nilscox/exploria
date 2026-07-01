import type { Shared } from '@exploria/server/shared';

import { type Assign } from 'src/utils';

import { ApiError } from './api-error';

const auth = {
  async login(token: string): Promise<Shared.User> {
    const res = await fetchApi('/auth/login', {
      method: 'POST',
      body: { token },
    });

    return res.json();
  },

  async me(): Promise<Shared.User | null> {
    try {
      const res = await fetchApi('/auth/me');

      return res.json();
    } catch (err) {
      if (ApiError.is(err) && err.status === 404) {
        return null;
      }

      throw err;
    }
  },

  async logout(): Promise<void> {
    await fetchApi('/auth/logout', { method: 'POST' });
  },
};

const sessions = {
  async list({ page, limit }: PaginationParams): Promise<Paginated<{ id: string; date: string; subject: string }>> {
    const res = await fetchApi('/session', {
      query: { page, limit },
    });

    return {
      items: await res.json(),
      nextPage: nextPage(res),
    };
  },

  async create({ model, language, demo }: { model: string; language: string; demo?: boolean }): Promise<string> {
    const res = await fetchApi('/session', {
      method: 'POST',
      body: { model, language, demo },
    });

    return res.text();
  },

  async get(id: string): Promise<Shared.Session> {
    const res = await fetchApi(`/session/${id}`);

    return res.json();
  },

  async delete(id: string): Promise<void> {
    await fetchApi(`/session/${id}`, {
      method: 'DELETE',
    });
  },

  async setModel(id: string, model: string): Promise<void> {
    await fetchApi(`/session/${id}/model`, {
      method: 'PUT',
      body: { model },
    });
  },

  async setPosture(id: string, posture: string): Promise<void> {
    await fetchApi(`/session/${id}/posture`, {
      method: 'PUT',
      body: { posture },
    });
  },

  async addTopic(id: string, topic: string): Promise<void> {
    await fetchApi(`/session/${id}/topic`, {
      method: 'POST',
      body: { topic },
    });
  },

  async addMindmapNode(id: string, node: { label: string; parentId?: string }): Promise<void> {
    await fetchApi(`/session/${id}/mindmap/node`, {
      method: 'POST',
      body: node,
    });
  },

  async updateMindmapNode(id: string, nodeId: string, label: string): Promise<void> {
    await fetchApi(`/session/${id}/mindmap/node/${nodeId}`, {
      method: 'PUT',
      body: { label },
    });
  },

  async removeMindmapNode(id: string, nodeId: string): Promise<void> {
    await fetchApi(`/session/${id}/mindmap/node/${nodeId}`, {
      method: 'DELETE',
    });
  },

  async connectMindmapNodes(id: string, edge: { source: string; target: string }): Promise<void> {
    await fetchApi(`/session/${id}/mindmap/edge`, {
      method: 'POST',
      body: edge,
    });
  },

  async removeMindmapEdge(id: string, edgeId: string): Promise<void> {
    await fetchApi(`/session/${id}/mindmap/edge/${edgeId}`, {
      method: 'DELETE',
    });
  },

  async postMessage(id: string, message: string): Promise<void> {
    await fetchApi(`/session/${id}/message`, {
      method: 'POST',
      body: { message },
    });
  },

  async selectDiscussionPath(id: string, pathId: string): Promise<void> {
    await fetchApi(`/session/${id}/discussion-path/${pathId}`, {
      method: 'POST',
    });
  },

  async end(id: string): Promise<Shared.Summary> {
    const res = await fetchApi(`/session/${id}/end`, { method: 'PUT' });

    return res.json();
  },

  stream(id: string): EventSource {
    return new EventSource(apiUrl(`/session/${id}/stream`), { withCredentials: true });
  },

  timer: {
    async start(id: string, duration: number) {
      await fetchApi(`/session/${id}/timer`, {
        method: 'POST',
        body: { duration },
      });
    },

    async clear(id: string) {
      await fetchApi(`/session/${id}/timer`, {
        method: 'delete',
      });
    },

    async pause(id: string) {
      await fetchApi(`/session/${id}/timer/pause`, {
        method: 'PUT',
      });
    },

    async resume(id: string) {
      await fetchApi(`/session/${id}/timer/resume`, {
        method: 'PUT',
      });
    },
  },
};

export const api = {
  auth,
  sessions,
};

async function fetchApi(
  endpoint: string,
  init: Assign<
    RequestInit,
    {
      query?: Partial<Record<string, string | string[] | number | number[]>>;
      body?: unknown;
    }
  > = {},
) {
  const url = apiUrl(endpoint);
  const headers = new Headers(init.headers);
  let body: BodyInit | undefined = undefined;

  if (init.query !== undefined) {
    for (const [name, value] of Object.entries(init.query)) {
      if (Array.isArray(value)) {
        value.forEach((value) => url.searchParams.append(name, String(value)));
      } else if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }
  }

  if (typeof init.body === 'object' && init.body !== null) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  }

  const res = await fetch(url, { ...init, headers, body, credentials: 'include' });

  if (!res.ok) {
    throw await ApiError.from(res);
  }

  return res;
}

const baseUrl = new URL(import.meta.env['VITE_API_BASE_URL'], window.location.origin);

function apiUrl(endpoint: string) {
  const url = new URL(endpoint, baseUrl.origin);

  if (baseUrl.pathname !== '/') {
    url.pathname = baseUrl.pathname + url.pathname;
  }

  return url;
}

type PaginationParams = {
  page?: number;
  limit?: number;
};

type Paginated<T> = {
  items: T[];
  nextPage: number | null;
};

function nextPage(res: Response): number | null {
  const page = Number(res.headers.get('X-Page'));
  const totalPages = Number(res.headers.get('X-Total-Pages'));

  return page < totalPages ? page + 1 : null;
}
