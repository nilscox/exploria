import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';

const context = createContext<MatomoClient>(null as never);

export function MatomoProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new MatomoClient(), []);

  useInjectScript(client);
  useTrackPageView(client);

  return <context.Provider value={client}>{children}</context.Provider>;
}

function useInjectScript(client: MatomoClient) {
  useEffect(() => {
    const analyticsUrl = import.meta.env['VITE_ANALYTICS_URL'];
    const analyticsSiteId = import.meta.env['VITE_ANALYTICS_SITE_ID'];

    if (!analyticsUrl || !analyticsSiteId) {
      return;
    }

    const script = document.createElement('script');
    const snippet = client.snippet(analyticsUrl, analyticsSiteId);

    script.innerHTML = snippet;
    document.body.appendChild(script);

    return () => {
      script.parentElement?.removeChild(script);
    };
  }, [client]);
}

function useTrackPageView(client: MatomoClient) {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    client.trackPageView([pathname, search, hash].filter(Boolean).join(''));
  }, [client, pathname, search, hash]);
}

export function useTrackEvent() {
  const client = useContext(context);

  return (...params: Parameters<MatomoClient['trackEvent']>) => {
    client?.trackEvent(...params);
  };
}

declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

class MatomoClient {
  private get _paq() {
    return window._paq;
  }

  trackPageView(url: string) {
    this._paq?.push(['setCustomUrl', url]);
    this._paq?.push(['trackPageView']);
  }

  trackEvent(category: string, action: string, { name, value }: { name?: string; value?: number } = {}) {
    this._paq?.push(['trackEvent', category, action, name, value]);
  }

  snippet(url: string, siteId: string) {
    return `
var _paq = window._paq = window._paq || [];

_paq.push(['enableLinkTracking']);

(function() {
  var u="${url}/";

  _paq.push(['setTrackerUrl', u+'matomo.php']);
  _paq.push(['setSiteId', ${siteId}]);

  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.type='text/javascript'; g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
})();`;
  }
}
