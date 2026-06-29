export interface Config {
  server: {
    host: string;
    port: number;
  };

  openAi: {
    baseUrl: string;
    apiKey: string;
  };

  database: {
    url: string;
    debug: boolean;
  };

  assistant?: 'test' | 'eval';

  tavilyApiKey?: string;
}

export class EnvConfig implements Config {
  private env(name: string): string | undefined;
  private env(name: string, required: true): string;
  private env(name: string, required?: true) {
    const value = process.env[name];

    if (value === undefined && required) {
      throw new Error(`Missing environment variable ${name}`);
    }

    return value;
  }

  get server() {
    return {
      host: this.env('HOST') ?? 'localhost',
      port: Number.parseInt(this.env('PORT') ?? '3000'),
    };
  }

  get openAi() {
    return {
      baseUrl: this.env('OPEN_AI_BASE_URL', true),
      apiKey: this.env('OPEN_AI_API_KEY', true),
    };
  }

  get database() {
    return {
      url: this.env('DATABASE_URL', true),
      debug: this.env('DATABASE_DEBUG') === 'true',
    };
  }

  get assistant() {
    const value = this.env('ASSISTANT');

    if (value === 'test' || value === 'eval') {
      return value;
    }
  }

  get tavilyApiKey() {
    return this.env('TAVILY_API_KEY');
  }
}
