export interface Config {
  env: 'development' | 'production' | 'test';

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

  auth: {
    cookieSecret: string;
    clientUrl: string;
  };

  assistant?: 'test' | 'eval';

  tavilyApiKey?: string;
}

export class EnvConfig implements Config {
  private read(name: string): string | undefined;
  private read(name: string, required: true): string;
  private read(name: string, required?: true) {
    const value = process.env[name];

    if (value === undefined && required) {
      throw new Error(`Missing environment variable ${name}`);
    }

    return value;
  }

  get env(): Config['env'] {
    const value = this.read('NODE_ENV');

    if (value === 'production' || value === 'test') {
      return value;
    }

    return 'development';
  }

  get server() {
    return {
      host: this.read('HOST') ?? 'localhost',
      port: Number.parseInt(this.read('PORT') ?? '3000'),
    };
  }

  get openAi() {
    return {
      baseUrl: this.read('OPEN_AI_BASE_URL', true),
      apiKey: this.read('OPEN_AI_API_KEY', true),
    };
  }

  get database() {
    return {
      url: this.read('DATABASE_URL', true),
      debug: this.read('DATABASE_DEBUG') === 'true',
    };
  }

  get auth() {
    return {
      cookieSecret: this.read('COOKIE_SECRET', true),
      clientUrl: this.read('CLIENT_URL', true),
    };
  }

  get assistant() {
    const value = this.read('ASSISTANT');

    if (value === 'test' || value === 'eval') {
      return value;
    }
  }

  get tavilyApiKey() {
    return this.read('TAVILY_API_KEY');
  }
}
