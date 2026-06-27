import { useEffect } from 'react';

export function DocumentTitle({ title }: { title?: string }) {
  useEffect(() => {
    document.title = title ? `${title} - Exploria` : 'Exploria';
  }, [title]);

  return null;
}
