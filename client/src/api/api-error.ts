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
