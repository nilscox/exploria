import type { Session } from '@exploria/shared';

async function fetchApi(endpoint: string, init?: RequestInit) {
  const url = new URL(endpoint, 'http://localhost:3000');
  const res = await fetch(url, init);

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

  async create(): Promise<string> {
    const res = await fetchApi('/session', {
      method: 'POST',
    });

    return res.text();
  },

  async get(id: string): Promise<Session> {
    const res = await fetchApi(`/session/${id}`);

    return res.json();
  },

  async delete(id: string): Promise<void> {
    await fetchApi(`/session/${id}`, {
      method: 'DELETE',
    });
  },

  sendMessage(id: string, message: string): EventSource {
    const url = new URL(`/session/${id}/message?message=${encodeURIComponent(message)}`, 'http://localhost:3000');

    return new EventSource(url);
  },

  stream(id: string): EventSource {
    const url = new URL(`/session/${id}/stream`, 'http://localhost:3000');

    return new EventSource(url);
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

    return new ApiError(this.getMessage(body), res.status, body);
  }

  private static getMessage(body: unknown) {
    if (typeof body === 'string') {
      return body;
    }

    if (typeof body === 'object' && body && 'message' in body && typeof body.message === 'string') {
      return body.message;
    }

    return 'Unknown API error';
  }
}
