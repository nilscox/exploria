export interface Config {
  server: {
    host: string;
    port: number;
  };

  openAi: {
    baseUrl?: string;
    apiKey: string;
  };

  database: {
    url: string;
    debug: boolean;
  };

  assistant: 'test' | undefined;
}

export class EnvConfig implements Config {
  private env(name: string, defaultValue?: string): string;
  private env<T>(name: string, defaultValue?: string, parse?: (value: string) => T): T;
  private env<T>(name: string, defaultValue?: string, parse?: (value: string) => T): string | T {
    const value = process.env[name] ?? defaultValue;

    if (value === undefined) {
      throw new Error(`Missing environment variable ${name}`);
    }

    return parse ? parse(value) : value;
  }

  get server() {
    return {
      host: this.env('HOST', 'localhost'),
      port: this.env('PORT', '3000', Number.parseInt),
    };
  }

  get openAi() {
    return {
      baseUrl: this.env('OPEN_AI_BASE_URL'),
      apiKey: this.env('OPEN_AI_API_KEY'),
    };
  }

  get database() {
    return {
      url: this.env('DATABASE_URL'),
      debug: this.env('DATABASE_URL', 'false', (value) => value === 'true'),
    };
  }

  get assistant() {
    return this.env('ASSISTANT', '', (value) => (value === 'test' ? value : undefined));
  }
}
