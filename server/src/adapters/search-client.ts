export type SearchResult = { title: string; url: string; snippet: string };

export interface SearchClient {
  search(query: string): Promise<SearchResult[]>;
}

export class TavilySearchClient implements SearchClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl = 'https://api.tavily.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async search(query: string): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey, query }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { results: Array<{ title: string; url: string; content: string }> };

    return data.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
  }
}

export class StubSearchClient implements SearchClient {
  results: SearchResult[] = [];

  async search(_query: string): Promise<SearchResult[]> {
    return this.results;
  }
}
