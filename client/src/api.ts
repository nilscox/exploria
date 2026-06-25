import type { Shared } from '@exploria/server/shared';

import { type Assign } from './utils';

const baseUrl = 'http://localhost:3000';

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
  const url = new URL(endpoint, baseUrl);
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

  const res = await fetch(url, { ...init, headers, body });

  if (!res.ok) {
    throw await ApiError.from(res);
  }

  return res;
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

  async addTopic(id: string, topic: string): Promise<void> {
    await fetchApi(`/session/${id}/topic`, {
      method: 'POST',
      body: { topic },
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

  stream(id: string): EventSource {
    return new EventSource(new URL(`/session/${id}/stream`, baseUrl));
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
  sessions,
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }

  static is(value: unknown): value is ApiError {
    return value instanceof this;
  }

  static async from(res: Response) {
    const contentType = res.headers.get('Content-Type');
    const body = await (contentType === 'application/json' ? res.json() : res.text());

    return new ApiError(this.getMessage(res, body), res.status, body);
  }

  private static getMessage(res: Response, body: unknown) {
    if (typeof body === 'string' && body !== '') {
      return body;
    }

    if (typeof body === 'object' && body && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }

    return [res.status, res.statusText].join(': ');
  }
}
