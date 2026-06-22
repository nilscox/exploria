import type { Shared } from '@exploria/server/shared';

import { type Assign } from './utils';

const baseUrl = 'http://localhost:3000';

async function fetchApi(endpoint: string, init: Assign<RequestInit, { body?: unknown }> = {}) {
  const headers = new Headers(init.headers);
  let body: BodyInit | undefined = undefined;

  if (typeof init.body === 'object' && init.body !== null) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  }

  const url = new URL(endpoint, baseUrl);
  const res = await fetch(url, { ...init, headers, body });

  if (!res.ok) {
    throw await ApiError.from(res);
  }

  return res;
}

const sessions = {
  async list(): Promise<Array<{ id: string; date: string; subject: string }>> {
    const res = await fetchApi('/session');

    return res.json();
  },

  async create({ model, demo }: { model: string; demo?: boolean }): Promise<string> {
    const res = await fetchApi('/session', {
      method: 'POST',
      body: { model, demo },
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
      headers: { 'Content-Type': 'application/json' },
      body: { model },
    });
  },

  async postMessage(id: string, message: string): Promise<void> {
    await fetchApi(`/session/${id}/message`, {
      method: 'POST',
      body: { message },
    });
  },

  stream(id: string): EventSource {
    return new EventSource(new URL(`/session/${id}/stream`, baseUrl));
  },

  async pauseTimer(id: string) {
    await fetchApi(`/session/${id}/timer/pause`, {
      method: 'PUT',
    });
  },

  async resumeTimer(id: string) {
    await fetchApi(`/session/${id}/timer/resume`, {
      method: 'PUT',
    });
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
